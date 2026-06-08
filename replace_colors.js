const fs = require('fs');
const path = require('path');

const directory = './src/app';

const replacements = {
  'bg-[#0D1117]': 'bg-background',
  'bg-[#161B22]': 'bg-card',
  'bg-[#30363D]': 'bg-muted',
  'border-[#30363D]': 'border-border',
  'text-[#F0F6FC]': 'text-foreground',
  'text-[#e9ebef]': 'text-foreground',
  'text-[#8B949E]': 'text-muted-foreground',
  'text-[#717182]': 'text-muted-foreground',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const [key, value] of Object.entries(replacements)) {
        if (content.includes(key)) {
          content = content.split(key).join(value);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(directory);
console.log('Done replacing colors.');
