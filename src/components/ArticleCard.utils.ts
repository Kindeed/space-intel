export type CardPointerActivationInput = {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  nestedInteractive: boolean;
};

export type CardKeyboardActivationInput = {
  key: string;
  isCurrentTarget: boolean;
};

export function shouldActivateCardPointerNavigation(input: CardPointerActivationInput): boolean {
  return (
    !input.defaultPrevented &&
    input.button === 0 &&
    !input.metaKey &&
    !input.altKey &&
    !input.ctrlKey &&
    !input.shiftKey &&
    !input.nestedInteractive
  );
}

export function shouldActivateCardKeyboardNavigation(input: CardKeyboardActivationInput): boolean {
  return input.isCurrentTarget && input.key === 'Enter';
}
