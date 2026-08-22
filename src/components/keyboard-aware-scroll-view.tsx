import { useCallback, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type ScrollViewProps,
} from 'react-native';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  extraKeyboardOffset?: number;
};

/**
 * Keeps the currently focused input visible when the software keyboard opens.
 *
 * KeyboardAvoidingView makes room for the keyboard, while the scroll responder
 * moves the focused native input into that newly visible area. The delayed
 * scroll is important on both platforms because the viewport is still being
 * resized when the keyboard event first arrives.
 */
export function KeyboardAwareScrollView({
  extraKeyboardOffset = 20,
  keyboardDismissMode,
  keyboardShouldPersistTaps = 'handled',
  onFocus,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingScroll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInput = useRef<unknown>(null);

  const scrollToFocusedInput = useCallback((focusedInput: unknown) => {
    if (Platform.OS === 'web') return;
    if (!focusedInput) return;

    scrollViewRef.current
      ?.getScrollResponder()
      ?.scrollResponderScrollNativeHandleToKeyboard(focusedInput, extraKeyboardOffset, true);
  }, [extraKeyboardOffset]);

  const scheduleFocusedInputScroll = useCallback((focusedInput?: unknown) => {
    const nextInput = focusedInput ?? TextInput.State.currentlyFocusedInput();
    if (!nextInput) return;

    pendingInput.current = nextInput;
    if (pendingScroll.current) clearTimeout(pendingScroll.current);
    pendingScroll.current = setTimeout(() => {
      scrollToFocusedInput(pendingInput.current);
    }, 320);
  }, [scrollToFocusedInput]);

  useEffect(() => {
    return () => {
      if (pendingScroll.current) clearTimeout(pendingScroll.current);
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
      style={styles.container}>
      <ScrollView
        {...props}
        ref={scrollViewRef}
        keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        onFocus={(event) => {
          onFocus?.(event);
          const focusedInput = TextInput.State.currentlyFocusedInput();
          if (focusedInput) scheduleFocusedInputScroll(focusedInput);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
