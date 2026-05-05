const fs = require('fs');
const path = require('path');
const dir = './src/controllers';
const files = fs.readdirSync(dir);

files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const filepath = path.join(dir, file);
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Replace res.status(201).json({ message: '...', [customKey]: value })
    // With res.status(201).json({ message: '...', [customKey]: value, id: value })
    
    const regex = /res\.status\(201\)\.json\(\{\s*message\s*:\s*([^,]+),\s*([a-zA-Z0-9_]+)\s*(:\s*[^}]+)?\s*\}\)/g;
    
    content = content.replace(regex, (match, msg, key, val) => {
        const value = val ? val.substring(1).trim() : key;
        // if the key is exactly 'id', we don't need to add it again
        if (key === 'id') return match;
        
        let newJson = `res.status(201).json({ message: ${msg}, ${key}${val || ''}, id: ${value} })`;
        return newJson;
    });
    
    fs.writeFileSync(filepath, content);
});
