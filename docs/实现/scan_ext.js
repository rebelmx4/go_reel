const fs = require('fs');
const path = require('path');

// --- 配置区 ---
// 请将 'YOUR_DIRECTORY_PATH' 替换为您要开始遍历的根文件夹路径
const rootDirectoryPath = 'E:/100_MyProjects/popcorn/server';

// 常见的视频文件后缀名列表 (可以根据需要添加或删除)
const videoExtensions = new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.rmvb', '.webm', '.mpg', '.mpeg', '.3gp'
]);
// --- 配置区结束 ---


/**
 * 递归遍历指定目录下的所有文件，并返回一个包含所有文件路径的数组。
 * @param {string} dir - 要遍历的目录路径。
 * @returns {string[]} 包含所有文件路径的数组。
 */
function getAllFilesRecursive(dir) {
    let fileList = [];
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // 如果是目录，则递归调用并将其结果合并到文件列表中
            fileList = fileList.concat(getAllFilesRecursive(filePath));
        } else {
            // 如果是文件，则直接添加到列表
            fileList.push(filePath);
        }
    });

    return fileList;
}

try {
    // 检查根路径是否存在
    if (!fs.existsSync(rootDirectoryPath) || !fs.statSync(rootDirectoryPath).isDirectory()) {
        console.error(`错误：找不到目录 "${rootDirectoryPath}" 或它不是一个有效的目录。`);
        process.exit(1); // 退出脚本
    }

    console.log(`正在从 "${rootDirectoryPath}" 及其所有子目录中递归扫描文件...`);

    // 1. 获取所有文件的路径
    const allFiles = getAllFilesRecursive(rootDirectoryPath);

    if (allFiles.length === 0) {
        console.log("在指定目录中没有找到任何文件。");
        process.exit(0);
    }

    // 2. 统计每种后缀名的数量
    const extensionCounts = {};
    allFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext) { // 确保文件有后缀名
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        }
    });

    // 3. 排序：将视频后缀名放在前面
    const sortedExtensions = Object.keys(extensionCounts).sort((a, b) => {
        const isVideoA = videoExtensions.has(a);
        const isVideoB = videoExtensions.has(b);

        if (isVideoA && !isVideoB) return -1; // a是视频，b不是，a排前面
        if (!isVideoA && isVideoB) return 1;  // b是视频，a不是，b排前面
        // 如果都是视频或都不是视频，则按字母顺序排序
        return a.localeCompare(b);
    });

    // 4. 分离并准备输出
    const videoStats = [];
    const otherStats = [];

    sortedExtensions.forEach(ext => {
        const count = extensionCounts[ext];
        const line = `- ${ext.padEnd(10)}: ${count} 个文件`; // 使用 padEnd 进行简单对齐
        if (videoExtensions.has(ext)) {
            videoStats.push(line);
        } else {
            otherStats.push(line);
        }
    });

    // 5. 打印结果
    console.log(`\n在 "${rootDirectoryPath}" 及其子孙目录中的文件后缀名统计结果 (共找到 ${allFiles.length} 个文件):`);

    if (videoStats.length > 0) {
        console.log("\n--- 视频文件 ---");
        videoStats.forEach(line => console.log(line));
    }

    if (otherStats.length > 0) {
        console.log("\n--- 其他文件 ---");
        otherStats.forEach(line => console.log(line));
    }

} catch (err) {
    console.error('处理文件时发生错误:', err);
}