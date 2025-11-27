import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { voiceAssistantAPI } from '@/services/api';

interface VoiceControlProps {
  className?: string;
  onCommandExecuted?: (result: any) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({ className, onCommandExecuted }) => {
  const { toast } = useToast();
  const { voiceToken, isAuthenticated, isLoading: sessionLoading, createVoiceSession } = useVoiceSession();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition && !!window.speechSynthesis);
    
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Initialize voice session on mount
  useEffect(() => {
    if (!isAuthenticated && !sessionLoading) {
      createVoiceSession().catch(err => {
        console.error('Failed to create voice session:', err);
      });
    }
  }, [isAuthenticated, sessionLoading, createVoiceSession]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        processCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice recognition error';
      switch(event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }

      toast({
        title: 'Voice Recognition Error',
        description: errorMessage,
        variant: 'destructive'
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSpeechSupported, toast]);

  const startListening = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Creating voice session...',
      });
      
      const session = await createVoiceSession();
      if (!session) {
        toast({
          title: 'Authentication Failed',
          description: 'Could not create voice session. Please try logging in again.',
          variant: 'destructive'
        });
        return;
      }
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast({
          title: 'Error',
          description: 'Failed to start voice recognition',
          variant: 'destructive'
        });
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const processCommand = async (command: string) => {
    if (!voiceToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please wait for voice session to be created',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    setLastCommand(command);

    try {
      const response = await voiceAssistantAPI.processVoiceCommand({
        command,
        assistant: 'web',
        voiceToken
      });

      setLastResult(response.data);

      if (response.data.success) {
        toast({
          title: 'Command Executed',
          description: response.data.message || 'Voice command successful',
        });

        // Text-to-speech response
        if (isTtsEnabled && synthRef.current) {
          speakResponse(response.data.message || 'Command executed successfully');
        }

        onCommandExecuted?.(response.data);
      } else {
        toast({
          title: 'Command Failed',
          description: response.data.message || 'Could not execute voice command',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Voice command error:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to process voice command';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });

      setLastResult({ success: false, message: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      synthRef.current.speak(utterance);
    }
  };

  if (!isSpeechSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Voice Control Not Available
          </CardTitle>
          <CardDescription>
            Your browser doesn't support voice recognition. Please use Chrome, Edge, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Control
          </span>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Authenticated
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {sessionLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Not Authenticated'
                )}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Use voice commands to control your devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? 'destructive' : 'default'}
            className="flex-1"
            disabled={isProcessing || sessionLoading || !isAuthenticated}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Voice Command
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
          >
            {isTtsEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>
        </div>

        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Transcript:</div>
            <div className="text-sm text-muted-foreground">{transcript}</div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing command...
          </div>
        )}

        {lastCommand && lastResult && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Last Command:</div>
            <div className="text-sm text-muted-foreground">{lastCommand}</div>
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Success</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600">Failed</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">Try saying:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>"Turn on classroom 1 light 1"</li>
            <li>"Turn off room 101 fan"</li>
            <li>"Switch on projector"</li>
            <li>"Status of classroom 1"</li>
            <li>"Turn off all lights"</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">Speech Recognition</Badge>
          {isTtsEnabled && <Badge variant="outline" className="text-xs">Text-to-Speech</Badge>}
          {isAuthenticated && <Badge variant="outline" className="text-xs">Authenticated</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};
