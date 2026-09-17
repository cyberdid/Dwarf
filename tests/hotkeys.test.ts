import { describe, it, expect } from 'vitest';
import { getHotkeyAction } from '../src/App';

describe('Global Hotkeys Resolution (src/App.tsx)', () => {
  describe('Single-step simulation tick (.)', () => {
    it('advances a single simulation tick when "." is pressed without shift', () => {
      const action = getHotkeyAction({
        key: '.',
        code: 'Period',
        shiftKey: false
      });
      expect(action).toBe('step_tick');
    });

    it('advances a single simulation tick when key is "." without code or shiftKey', () => {
      const action = getHotkeyAction({
        key: '.'
      });
      expect(action).toBe('step_tick');
    });

    it('advances tick when code is "Period" without shift even on different keyboard layouts', () => {
      const action = getHotkeyAction({
        key: 'Unidentified',
        code: 'Period',
        shiftKey: false
      });
      expect(action).toBe('step_tick');
    });
  });

  describe('Z-level Elevation Keys (< and > / [ and ])', () => {
    it('ascends Z-level on ">" (Shift + Period on US keyboard) without triggering step_tick', () => {
      // US keyboard: Shift + . produces key ">", code "Period", shiftKey true
      const action = getHotkeyAction({
        key: '>',
        code: 'Period',
        shiftKey: true
      });
      expect(action).toBe('ascend_z');
      expect(action).not.toBe('step_tick');
    });

    it('descends Z-level on "<" (Shift + Comma on US keyboard) without triggering step_tick', () => {
      // US keyboard: Shift + , produces key "<", code "Comma", shiftKey true
      const action = getHotkeyAction({
        key: '<',
        code: 'Comma',
        shiftKey: true
      });
      expect(action).toBe('descend_z');
      expect(action).not.toBe('step_tick');
    });

    it('ascends Z-level on standard bracket key "]" or BracketRight', () => {
      expect(getHotkeyAction({ key: ']', code: 'BracketRight' })).toBe('ascend_z');
      expect(getHotkeyAction({ key: ']', code: 'BracketRight', shiftKey: false })).toBe('ascend_z');
      expect(getHotkeyAction({ key: 'Unidentified', code: 'BracketRight' })).toBe('ascend_z');
    });

    it('descends Z-level on standard bracket key "[" or BracketLeft', () => {
      expect(getHotkeyAction({ key: '[', code: 'BracketLeft' })).toBe('descend_z');
      expect(getHotkeyAction({ key: '[', code: 'BracketLeft', shiftKey: false })).toBe('descend_z');
      expect(getHotkeyAction({ key: 'Unidentified', code: 'BracketLeft' })).toBe('descend_z');
    });

    it('does NOT ascend Z-level on "." alone', () => {
      const action = getHotkeyAction({
        key: '.',
        code: 'Period',
        shiftKey: false
      });
      expect(action).not.toBe('ascend_z');
      expect(action).toBe('step_tick');
    });

    it('does NOT descend Z-level on "."', () => {
      const action = getHotkeyAction({
        key: '.',
        code: 'Period',
        shiftKey: false
      });
      expect(action).not.toBe('descend_z');
    });
  });

  describe('Form Input Ignore Guards', () => {
    it('ignores shortcuts when target is an input element', () => {
      const action = getHotkeyAction({
        key: '.',
        code: 'Period',
        shiftKey: false,
        target: { tagName: 'INPUT' }
      });
      expect(action).toBeNull();
    });

    it('ignores shortcuts when target is a textarea element', () => {
      const action = getHotkeyAction({
        key: '>',
        code: 'Period',
        shiftKey: true,
        target: { tagName: 'TEXTAREA' }
      });
      expect(action).toBeNull();
    });
  });

  describe('Core Fortress Shortcuts', () => {
    it('pauses and resumes on Space', () => {
      expect(getHotkeyAction({ key: ' ', code: 'Space' })).toBe('toggle_running');
    });

    it('toggles DFHack console on ` or ~', () => {
      expect(getHotkeyAction({ key: '`', code: 'Backquote' })).toBe('toggle_dfhack');
      expect(getHotkeyAction({ key: '~', code: 'Backquote', shiftKey: true })).toBe('toggle_dfhack');
    });

    it('selects tools accurately', () => {
      expect(getHotkeyAction({ key: 'd' })).toBe('tool_mine');
      expect(getHotkeyAction({ key: 't' })).toBe('tool_chop');
      expect(getHotkeyAction({ key: 'g' })).toBe('tool_gather');
      expect(getHotkeyAction({ key: 'p' })).toBe('tool_stockpiles');
      expect(getHotkeyAction({ key: 'b' })).toBe('tool_build');
      expect(getHotkeyAction({ key: 'w' })).toBe('tool_workshops');
      expect(getHotkeyAction({ key: 'q' })).toBe('tool_inspect');
      expect(getHotkeyAction({ key: 'c' })).toBe('tool_cancel');
    });

    it('opens modals and overworld view', () => {
      expect(getHotkeyAction({ key: 'u' })).toBe('open_units');
      expect(getHotkeyAction({ key: 'm' })).toBe('toggle_overworld');
      expect(getHotkeyAction({ key: 'M' })).toBe('toggle_overworld');
      expect(getHotkeyAction({ key: '?' })).toBe('open_help');
      expect(getHotkeyAction({ key: 'h' })).toBe('open_help');
      expect(getHotkeyAction({ key: 'F1' })).toBe('open_help');
    });
  });
});
