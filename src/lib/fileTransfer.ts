let sharedFile: File | null = null;

export function setSharedFile(file: File): void {
  sharedFile = file;
}

export function getSharedFile(): File | null {
  const f = sharedFile;
  sharedFile = null;
  return f;
}
