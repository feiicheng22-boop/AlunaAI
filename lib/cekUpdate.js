const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

const repoUrl = 'https://github.com/XenoviaCompany/Balbalalalaka.git';
const rootPath = path.resolve(__dirname, '..');
const tempRepoPath = path.join(rootPath, 'tmp-repo');

// Ambil versi dari package.json
function getVersion(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data).version;
}

// Clone repo ke folder sementara
async function cloneRepo() {
    if (!fs.existsSync(tempRepoPath)) {
        fs.mkdirSync(tempRepoPath, { recursive: true });
    }

    const git = simpleGit(tempRepoPath);
    console.log('🔄 Checking for updates...');
    await git.clone(repoUrl, '.');
}

// Copy file dari repo update ke direktori utama
function copyFiles(src, dest) {
    const files = fs.readdirSync(src);
    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);

        if (fs.statSync(srcPath).isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyFiles(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Hapus folder tmp-repo
function cleanUp() {
    if (fs.existsSync(tempRepoPath)) {
        fs.rmSync(tempRepoPath, { recursive: true, force: true });
    }
}

// Fungsi utama: cek dan update
async function cloneOrUpdateRepo() {
    try {
        const localVersion = getVersion(path.join(rootPath, 'package.json'));
        await cloneRepo();
        const remoteVersion = getVersion(path.join(tempRepoPath, 'package.json'));

        if (localVersion !== remoteVersion) {
            console.log(`📦 Update tersedia: ${localVersion} → ${remoteVersion}`);
            copyFiles(tempRepoPath, rootPath);
            console.log('✅ Update selesai. Semua file telah diperbarui.');
        } else {
            console.log('🟢 Versi saat ini sudah yang terbaru.');
        }

        cleanUp();
    } catch (err) {
        console.error('❌ Gagal saat update:', err.message);
    }
}

module.exports = { cloneOrUpdateRepo };