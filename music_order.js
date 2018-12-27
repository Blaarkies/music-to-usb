let fs = require('fs');
let glob = require('glob'); // npm install glob
let mm = require('musicmetadata'); // npm install musicmetadata

function writeToFile(fileName, payload) {
    fs.writeFile('./' + fileName, payload, err => {
        if (err) {
            console.log(err);
            return false;
        }
        return true;
    });
}

function getDirectories(src) {
    return new Promise(resolve => {
        glob(src + '/**/*', (err, res) => {
            if (err) {
                console.log('Error ', err);
            } else {
                resolve(res);
            }
        });

    });
}

function parseMp3(fileName) {
    return new Promise(resolve => {
        let readableStream = fs.createReadStream(fileName);
        mm(readableStream, (err, metadata) => {
            if (err) {
                throw err;
            }
            metadata.filePath = fileName;
            metadata.size = fs.statSync(fileName).size;
            readableStream.close();
            resolve(metadata);
        });
    });
}

function sortNumbers(a, b) {
    if (a.number && b.number) {
        return 0;
    } else if (a.number && !b.number) {
        return 1;
    } else if (!a.number && b.number) {
        return -1;
    } else if (!a.number && !b.number) {
        return 0;
    }
}

function cleanUpText(text) {
    return text.toLowerCase()
        .replace(/[^\w ]|_/g, '')
        .split('the ').join('')
        .split('of ').join('')
        .split(' feat')[0]
        .split('  ').join(' ')
        .split('  ').join(' ');
}

function toTitlecase(text) {
    return text.trim()
        .split(' ')
        .map(w => {
            try {
                w[0].toUpperCase();
            } catch (e) {
                debugger;
            }
            return w[0].toUpperCase() + w.substring(1).toLowerCase();
        })
        .join(' ');
}

function writingToDisk(counterObject, totalCount) {
    console.log(`Progress: ${Math.round(((counterObject.count + 1) / totalCount) * 100)}%`);
}

function getPromiseFromLink(link) {
    return new Promise(resolve => {
        try {
            fs.copyFileSync(link.oldPath, link.newPath);
            resolve();
        } catch (e) {
            console.log('|X| ', e);
            resolve();
        }
        // fs.copyFile(link.oldPath, link.newPath, err => {
        //     if (err) {
        //         throw err;
        //     }
        //     resolve()
        // });
    });
}

function splitUpFoldersIntoNumbers(filledFolders) {
    do {
        filledFolders.filter(ff => ff.songs.length > 99)
            .forEach(overFill => {

                let songsToKeep = overFill.songs.slice(0, 99);
                let songsToMove = overFill.songs.slice(99);

                overFill.songs = songsToKeep;

                let newFolder = {
                    name: overFill.name,
                    number: (overFill.number || 0) + 1,
                    songs: songsToMove
                };

                filledFolders.push(newFolder);
            });

        console.log(`Folder count: ${filledFolders.length}`);
    } while (filledFolders.some(f => f.songs.length > 99));
    return filledFolders;
}

function pourSmallFoldersIntoMisc(filledFolders) {
    while (filledFolders.length > 99) {
        let openMiscFolder = filledFolders.some(ff => ff.name === Constants.a_misc && ff.songs.length < 99);
        if (!openMiscFolder) {
            let lastMiscFolder = filledFolders.filter(ff => ff.name === Constants.a_misc)
                .sort((a, b) => b.number - a.number)
                [0];
            lastMiscFolder = (lastMiscFolder || {});

            filledFolders.push({
                name: Constants.a_misc,
                number: (lastMiscFolder.number || 0) + 1,
                songs: []
            });
        }

        let minSongsFolder = filledFolders.filter(ff => ff.name !== Constants.a_misc)
            .sort((a, b) => sortNumbers(a, b) || a.songs.length - b.songs.length)
            [0];

        let lastMiscFolder = filledFolders.filter(ff => ff.name === Constants.a_misc)
            .sort((a, b) => b.number - a.number)
            [0];
        lastMiscFolder.songs.push(...minSongsFolder.songs);

        filledFolders = filledFolders.filter(ff => ff !== minSongsFolder);

        if (lastMiscFolder.songs.length > 99) {
            filledFolders.push({
                name: Constants.a_misc,
                number: (lastMiscFolder.number || 0) + 1,
                songs: lastMiscFolder.songs.slice(99)
            });
            lastMiscFolder.songs = lastMiscFolder.songs.slice(0, 99);
        }


        console.log(`Removing folder "${minSongsFolder.name}${minSongsFolder.number ? ' ' + minSongsFolder.number : ''}"`
            + ` | Adding ${minSongsFolder.songs.length} files to ${lastMiscFolder.name}`);
    }
    return filledFolders;
}

function createFilenames(filledFolders) {
    filledFolders.forEach(ff => {
        ff.name = toTitlecase(ff.name);
        ff.songs.forEach(song => {
            let artistName = toTitlecase(song.artistFolder);
            let artistNameList = song.artistFolder.split(' ');
            if (artistNameList.length > 1) {
                artistName = artistNameList.reduce((text, c, i, array) => {
                    if (i === array.length - 1) {
                        return text += c;
                    }
                    return text += c.substring(0, 1) + '.';
                }, '')
                    .split('.').map(w => toTitlecase(w)).join('.');
            }

            song.filename = `${artistName.slice(0, 6)}-${song.title}`;
        });
    });
    return filledFolders;
}

function createEmptyFolders(filledFolders) {
    filledFolders.forEach(ff => {
        let folderName = ff.number ? (ff.name + ' ' + ff.number) : ff.name;
        try {
            fs.mkdirSync(`${Constants.usb}/${folderName}`);
        } catch (e) {
            console.log('|X| ', e);
        }
    });
}

async function writeFilesToNewStructure(moveLinks) {
    let totalFilesCount = moveLinks.length;
    let counterObject = {count: 0};
    let bufferSize = 20;
    moveLinks.reduce((sum, c, i, a) => {
        if ((i % bufferSize) === 0) {
            sum.push(a.slice(i, i + bufferSize));
        }
        return sum;
    }, [])
        .forEach(async group => {
            let resolves = await Promise.all(
                group.map(item => getPromiseFromLink(item)));
            counterObject.count += resolves.length;
            writingToDisk(counterObject, totalFilesCount);
        });
}

async function getListMp3Metas() {
    let filePaths = await getDirectories(Constants.music);
    let mp3FilesPaths = filePaths.filter(fp => fp.slice(-4).toLowerCase() === Constants.mp3Extension);
    console.log(`MP3s found: ${mp3FilesPaths.length}`);

    let listMeta = await Promise.all(mp3FilesPaths.map(fp => parseMp3(fp)));
    listMeta = listMeta.map(meta => {
        if (!(meta.title && meta.artist && meta.albumartist)) {
            meta.title = meta.title || meta.filePath.split('-')[1] || 'Untitled';
            meta.artist = meta.artist || [meta.filePath.split('-')[0]] || ['Untitled'];
            meta.albumartist = meta.albumartist || [meta.filePath.split('-')[0]] || ['Untitled'];
        }
        return {
            title: toTitlecase(cleanUpText(meta.title)),
            artist: meta.artist,
            albumartist: meta.albumartist,
            filePath: meta.filePath,
            size: meta.size,
            artistFolder: cleanUpText(meta.artist[0] || meta.albumartist[0])
        }
    });

    let folderNames = listMeta.map(meta => meta.artistFolder)
        .filter((c, i, a) => a.indexOf(c) === i);

    let sizeOfAllSongs = listMeta.reduce((sum, c) => sum += c.size, 0);
    if (sizeOfAllSongs >= Constants.flashDriveSizeGb * Constants.bitsOneGb) {
        console.error(`Source: ${sizeOfAllSongs / Constants.bitsOneGb}GB, Flashdrive: ${Constants.flashDriveSizeGb}GB`);
        throw new Error('Not enough space on flashdrive')
    }

    return {mp3FilesPaths, listMeta, folderNames};
}

async function doStuff() {
    let {mp3FilesPaths, listMeta, folderNames} = await getListMp3Metas();

    // Make folder with artist names and their songs
    let filledFolders = folderNames.map(fn => ({
        name: fn,
        number: undefined,
        songs: listMeta.filter(meta => meta.artistFolder === fn)
    }));

    filledFolders = splitUpFoldersIntoNumbers(filledFolders);
    filledFolders = pourSmallFoldersIntoMisc(filledFolders);
    filledFolders = createFilenames(filledFolders);

    let songsInFolders = filledFolders.reduce((count, now) => count += now.songs.length, 0);
    console.log(`Song Count: ${mp3FilesPaths.length}, Songs in folders: ${songsInFolders}`);
    createEmptyFolders(filledFolders);

    let moveLinks = filledFolders.reduce((list, ff) => {
        let folderName = ff.number ? (ff.name + ' ' + ff.number) : ff.name;
        list.push(...ff.songs.map(s => ({
            oldPath: s.filePath,
            newPath: `${Constants.usb}/${folderName}/${s.filename}${Constants.mp3Extension}`
        })));
        return list;
    }, []);

    writeToFile('checkNames.txt', moveLinks.reduce((s, song) => s += song.oldPath + ' >██> ' + song.newPath + String.fromCharCode(10), ''));

    await writeFilesToNewStructure(moveLinks);
}


const Constants = {
    music: '..\\..\\..\\MUSIC',
    // music: 'music',
    usb: 'usb',
    mp3Extension: '.mp3',
    a_misc: 'a_misc',
    flashDriveSizeGb: 16,
    bitsOneGb: 8000000000,
    bytesIn16GbFlashDrive: 15774760960,
};

let meIgnoreTheReturnedPromise = doStuff();
