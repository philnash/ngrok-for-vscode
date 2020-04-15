declare module 'ngrok/download' {
  function download(
      callback: (err?: Error) => void, options?: {[key: string]: any}): void;
  export = download;
}