import { EmbedBlot } from 'parchment';
import { Quill } from 'react-quill-new';

class ImageUploadingBlot extends EmbedBlot {
  static blotName = 'imageUploading';
  static tagName = 'SPAN';
  static className = 'ql-image-upload-placeholder';

  static create(value: string) {
    const node = super.create() as HTMLSpanElement;
    node.dataset.uploadId = String(value);
    node.setAttribute('contenteditable', 'false');

    const spinner = document.createElement('span');
    spinner.className = 'ql-image-upload-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Uploading image');
    node.appendChild(spinner);

    return node;
  }

  static value(domNode: HTMLSpanElement) {
    return domNode.dataset.uploadId ?? '';
  }
}

let registered = false;

export function registerImageUploadingBlot() {
  if (registered) return;
  Quill.register(ImageUploadingBlot, true);
  registered = true;
}
