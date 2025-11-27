/*
  Simple PDF generator for role-permissions.json
  Usage:
    npm install pdfkit
    node scripts/generate-role-permissions-pdf.js
  Output: docs/role-permissions.pdf
*/

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const dataPath = path.join(__dirname, '..', 'docs', 'role-permissions.json');
const outPath = path.join(__dirname, '..', 'docs', 'role-permissions.pdf');

if (!fs.existsSync(dataPath)) {
  console.error('Data file not found:', dataPath);
  process.exit(1);
}

const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);

const doc = new PDFDocument({ margin: 40, size: 'A4' });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

// Title
doc.fontSize(18).text('AutoVolt — Role Permissions', { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(10).text('Generated from docs/role-permissions.json (defaults from backend/models/User.js)', { align: 'center' });
doc.moveDown(1);

// Prepare table layout
const keys = data.permissionKeys;
const roles = data.roles;

// Calculate column widths: first column 120, remainder split
const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const firstCol = 120;
const otherCols = keys.length > 0 ? (pageWidth - firstCol) / keys.length : (pageWidth - firstCol);

// Header
const startX = doc.x;
let y = doc.y;

doc.font('Helvetica-Bold').fontSize(9);
// Role header
doc.text('Role / Permission', startX, y, { width: firstCol, continued: true });
// Permission headers
keys.forEach((k, i) => {
  doc.text(k, startX + firstCol + i * otherCols, y, { width: otherCols, align: 'center' });
});

y += 18;
doc.moveTo(startX, y - 4).lineTo(startX + pageWidth, y - 4).stroke();

doc.font('Helvetica').fontSize(9);

const rowHeight = 18;

roles.forEach((r) => {
  if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.y;
  }
  // Role name
  doc.text(r.role, startX, y, { width: firstCol });
  // Permissions
  keys.forEach((k, i) => {
    const v = r.permissions[k] ? '✔' : '';
    doc.text(v, startX + firstCol + i * otherCols, y, { width: otherCols, align: 'center' });
  });
  y += rowHeight;
});

// Footer note
if (y + 40 > doc.page.height - doc.page.margins.bottom) doc.addPage();

doc.moveDown(2);
doc.fontSize(8).text('Note: This PDF contains the default role permissions applied in the backend models. Runtime overrides may exist in the RolePermissions collection.', { align: 'left' });

// Finalize
doc.end();

stream.on('finish', () => {
  console.log('PDF generated at', outPath);
});
