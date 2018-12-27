### pre-alpha
 ## **music-to-usb**
 
 Problem statement:
 * There are a 1000+ mp3 files in mis-named, unorganized and even nested folders
 * An mp3 player in a specific car has the following limitations
   * No folder nesting allowed
   * Max 99 folders in the usb flashdrive's root directory
   * Max 99 mp3 files in any folder
   * User prefers having a folder for each artist
   * User wants to easily identify the currently playing song, but the LCD displays 
   only 10 characters at a time
   
Solution script:
* Read all mp3 files from a source folder
* Rename them using meta data, else use the old file/folder name
* Place files into folder structure with
  * "Artist name" -> Songs of artist
* Slice folders into chunks of 99 files
  * Create "Artist name 1", where 1 will increment for every successive folder of 
  this artist
* Decrease the folder count to 99 or less
  * Artists with the least amount of files, will have their folder deleted and the 
  files transferred to a common folder
  * The common folder will have a mix of many artists' files
  * Successive common folders will be created with incrementing numbers, if the 
  common folder reaches 99 files
* Write new files in new folder structure to destination

## How to use
* This is a pre-alpha/WIP script. Simply don't use it
* ...ok if you really want to:
  * Look at the defined object
    * Constants = {
    >               music: '..\\..\\..\\MUSIC',
    >               usb: 'usb',
    >               mp3Extension: '.mp3',
    >               a_misc: 'a_misc',
    >               flashDriveSizeGb: 16,
    >               bitsOneGb: 8000000000,
    >               bytesIn16GbFlashDrive: 15774760960
    * };
  * Changing the values in this will control most of the script
    * music: The source directory for the original files
    * usb: The output directory
    * flashDriveSizeGb: (WIP) Limit the amount of files being written, based on 
    available space on the flashdrive
    * bytesIn16GbFlashDrive: Override for when the Allocation Unit Size differs from 
    expected results
  * Look at the console output. It provides some debug support and feedback as to 
  what is currently happening
  * Verify file names in "checkNames.txt". It contains the old filepath, and the new 
  filepath to every file that is intended to be written to the flashdrive
  * Currently, all processing happens through the method called "doStuff()"
  
Please add any issues in this repo regarding this script, you are also more than 
welcome to submit pull requests, and message me for help/explanations


