declare module "ngrok/download" {
  function download(
    callback: (err?: Error) => void,
    options?: {
      cafilePath: string;
      arch: string;
      cdnUrl: string;
      cdnPath: string;
      ignoreCache: boolean;
    }
  ): void;
  export = download;
}
