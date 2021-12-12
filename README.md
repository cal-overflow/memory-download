# Download Snapchat Memories

Have you ever wanted to stop using the social media platform, Snapchat, but you remember that you have hundreds or even thousands of photos and videos stored in your memories?

This simple JavaScript application allows you to say goodbye to the service by downloading all of your memories to your computer (in regular `jpg` and `mp4` formats).

### System requirements

1. [NodeJS](http://nodejs.org) (v17.1.0)
2. [npm](http://npmjs.com)
3. [nvm](http://nvm.sh/)

### Steps
<!-- no toc -->
1. [Download this program](#download-this-program)
2. [Download your Snapchat data](#download-your-snapchat-data)
3. [Copy your memory data into the program](#copy-your-memory-data-into-the-program)
4. [Run the program](#run-the-program)
5. Enjoy access to your memories!

## Download this program

In order to run the program, you must clone this repository onto your computer. [Learn more about cloning a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository#cloning-a-repository).

Once the repository is cloned on your computer, navigate to the repository folder, `memory-download`.

Ensure that you are using the correct version of `node` with `nvm`:

```bash
nvm use
```

Install the required node modules using `npm`:

```bash
npm i
```

## Download your Snapchat data

Snapchat makes downloading your data very simple!

1. Sign into your Snapchat account at [accounts.snapchat.com](https://accounts.snapchat.com/)
2. Click **My Data**
3. Click **Submit Request** at the bottom of the page
4. Wait for an email from Snapchat with a link to your data archive. (This may take as long as a day)
5. Follow the link found in your email and follow the given instructions to download your data.

For additional help, view the official [Download My Data](https://support.snapchat.com/en-US/a/download-my-data) Snapchat support page.

## Copy your memory data into the program

Find the file `memories_history.json` from within the zip file downloaded from the last step. Copy or move this file to the `memory-download` folder.

## Run the program


Start the program with `npm`:

```bash
npm start
```

Wait for the program to terminate. You will now find a copy of your memories in the folder `memory-download/memories/`.