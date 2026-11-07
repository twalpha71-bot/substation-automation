
export {};

declare global {
  interface Window {
    __SAS_DEEP_LINK__?: {
      tab: string;
      moduleId?: string;
      subTab?: string;
      chapterId?: string;
      topicFilter?: string;
    } | null;
  }
}
