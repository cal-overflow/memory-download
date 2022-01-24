# Download Snapchat Memories

[![Download Snapchat Memories](assets/memory-download.png)](http://www.downloadmysnapchatmemories.com)

Have you ever wanted to stop using the social media platform, Snapchat, but you remember that you have hundreds or even thousands of photos and videos stored in your memories?

This project allows you to say goodbye to the service by downloading all of your memories to your computer (in regular `jpg` and `mp4` formats).

Visit [www.downloadmysnapchatmemories.com](http://www.downloadmysnapchatmemories.com).


### Running locally
<!-- no toc -->

#### System requirements
1. [NodeJS](http://nodejs.org) (v17.1.0)
2. [npm](http://npmjs.com)
3. [nvm](http://nvm.sh/)

Once the repository is cloned on your computer, navigate to the repository folder, `memory-download`.

Ensure that you are using the correct version of `node` with `nvm`:

```bash
nvm use
```

Install the required node modules using `npm`:

```bash
npm i
```

Run the [Electron](https://www.electronjs.org/) desktop application in development mode
```bash
npm run dev
```

An electron application will open in development mode. Follow the steps provided by the simple user-interface to download your Snapchat memories.