const path = require('path');
const fs = require('fs');
const deleteFile = (relativePathToFile) => {
    const AbsolutePathToFile = path.join(__basedir, relativePathToFile);
    if (fs.existsSync(AbsolutePathToFile)) {
        fs.unlinkSync(AbsolutePathToFile)
    };
}

module.exports = deleteFile