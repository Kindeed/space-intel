import { describe, expect, it } from 'vitest';
import { shouldActivateCardKeyboardNavigation, shouldActivateCardPointerNavigation, type CardPointerActivationInput } from './ArticleCard.utils';

const plainPrimaryClick: CardPointerActivationInput = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  nestedInteractive: false,
};

describe('ArticleCard activation helpers', () => {
  it('activates detail navigation on plain primary card clicks', () => {
    expect(shouldActivateCardPointerNavigation(plainPrimaryClick)).toBe(true);
  });

  it('keeps modified, secondary, prevented, and nested-interactive clicks available for native behavior', () => {
    expect(shouldActivateCardPointerNavigation({ ...plainPrimaryClick, button: 1 })).toBe(false);
    expect(shouldActivateCardPointerNavigation({ ...plainPrimaryClick, defaultPrevented: true })).toBe(false);
    expect(shouldActivateCardPointerNavigation({ ...plainPrimaryClick, metaKey: true })).toBe(false);
    expect(shouldActivateCardPointerNavigation({ ...plainPrimaryClick, ctrlKey: true })).toBe(false);
    expect(shouldActivateCardPointerNavigation({ ...plainPrimaryClick, nestedInteractive: true })).toBe(false);
  });

  it('activates keyboard navigation only for Enter on the card itself', () => {
    expect(shouldActivateCardKeyboardNavigation({ key: 'Enter', isCurrentTarget: true })).toBe(true);
    expect(shouldActivateCardKeyboardNavigation({ key: ' ', isCurrentTarget: true })).toBe(false);
    expect(shouldActivateCardKeyboardNavigation({ key: 'Enter', isCurrentTarget: false })).toBe(false);
  });

});
