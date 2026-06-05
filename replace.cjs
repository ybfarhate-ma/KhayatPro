const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/slate-800/g, 'primary-800');
  content = content.replace(/slate-100/g, 'gray-100');
  content = content.replace(/slate-200/g, 'gray-200');
  content = content.replace(/slate-700/g, 'gray-700');
  content = content.replace(/slate-600/g, 'gray-600');
  content = content.replace(/slate-500/g, 'gray-500');
  content = content.replace(/slate-400/g, 'gray-400');
  content = content.replace(/slate-50/g, 'gray-50');
  fs.writeFileSync(filePath, content, 'utf8');
}

function traverse(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  });
}

traverse('./src');
console.log('Done');
