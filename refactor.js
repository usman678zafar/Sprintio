const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacePatterns = [
  { regex: /\bbg-white\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-slate-\d+\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-gray-\d+\b/g, replacement: 'bg-surface' },
  { regex: /\bbg-\[[^\]]+\]\b/g, replacement: 'bg-surface' },
  { regex: /\bdark:bg-\S+\b/g, replacement: '' },
  
  { regex: /\btext-slate-[89]00\b/g, replacement: 'text-text-base' },
  { regex: /\btext-gray-[89]00\b/g, replacement: 'text-text-base' },
  { regex: /\btext-slate-\d+\b/g, replacement: 'text-muted' },
  { regex: /\btext-gray-\d+\b/g, replacement: 'text-muted' },
  { regex: /\btext-neutral-\d+\b/g, replacement: 'text-muted' },
  { regex: /\bdark:text-\S+\b/g, replacement: '' },
  
  { regex: /\bborder-slate-\d+\b/g, replacement: 'border-border-subtle' },
  { regex: /\bborder-gray-\d+\b/g, replacement: 'border-border-subtle' },
  { regex: /\bborder-neutral-\d+\b/g, replacement: 'border-border-subtle' },
  { regex: /\bdark:border-\S+\b/g, replacement: '' },
  
  // Clean double spaces in classnames
  { regex: / +/g, replacement: ' ' },
  { regex: / "/g, replacement: '"' }
];

['app', 'components'].forEach(dir => {
  if (fs.existsSync(dir)) {
    walk(dir, function(filePath) {
      if (!/\.(tsx|ts|jsx|js)$/.test(filePath)) return;
      let content = fs.readFileSync(filePath, 'utf8');
      let originalBlockPattern = /(className=["'`])(.*?)(["'`])/g;
      
      let newContent = content.replace(originalBlockPattern, (match, p1, p2, p3) => {
        let classes = p2;
        replacePatterns.forEach(({regex, replacement}) => {
          classes = classes.replace(regex, replacement);
        });
        return `${p1}${classes.trim()}${p3}`;
      });
      
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    });
  }
});

console.log('Update complete.');