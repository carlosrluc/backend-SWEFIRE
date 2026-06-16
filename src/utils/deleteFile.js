const path = require('path');
const fs = require('fs');

const deleteFile = (relativePathToFile) => {
    if (!relativePathToFile || typeof relativePathToFile !== 'string') {
        return;
    }
    const normalized = relativePathToFile.replace(/^\/+/, '');
    const absolutePathToFile = path.join(global.__basedir || path.join(__dirname, '..'), normalized);
    if (fs.existsSync(absolutePathToFile)) {
        fs.unlinkSync(absolutePathToFile);
    }
};

module.exports = deleteFile;