import { createContext, forwardRef, useCallback, useContext, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  type ScrollViewProps,
  type TextInputProps,
} from 'react-native';

type KeyboardAwareScrollViewProps = ScrollViewProps & {
  extraKeyboardOffset?: number;
  keyboardVerticalOffset?: number;
};

type KeyboardContextValue = {
  revealInput: (input: unknown) => void;
};

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

/**
 * Keeps the currently focused input visible when the software keyboard opens.
 *
 * KeyboardAvoidingView makes room for the keyboard, while the scroll responder
 * moves the focused native input into that newly visible area. The delayed
 * scroll is important on both platforms because the viewport is still being
 * resized when the keyboard event first arrives.
 */
export function KeyboardAwareScrollView({
  // Reserve enough space below the focused field for the app's primary button.
  // Multiline fields are tall, so a small input-only offset still hides the
  // action button behind the software keyboard.
  extraKeyboardOffset = 240,
  keyboardVerticalOffset = 0,
  keyboardDismissMode,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingScrolls = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingInput = useRef<unknown>(null);

  const scrollToFocusedInput = useCallback((focusedInput: unknown) => {
    if (process.env.EXPO_OS === 'web') return;
    if (!focusedInput) return;

    scrollViewRef.current
      ?.getScrollResponder()
      ?.scrollResponderScrollNativeHandleToKeyboard(focusedInput, extraKeyboardOffset, true);
  }, [extraKeyboardOffset]);

  const revealInput = useCallback((input: unknown) => {
    if (!input || process.env.EXPO_OS === 'web') return;

    pendingInput.current = input;
    pendingScrolls.current.forEach((timer) => globalThis.clearTimeout?.(timer));
    pendingScrolls.current = [];

    // The first pass reacts quickly; the second follows the completed keyboard
    // animation and the final KeyboardAvoidingView height/padding.
    scrollToFocusedInput(input);
    pendingScrolls.current = [120, 380].map((delay) => setTimeout(() => {
      scrollToFocusedInput(pendingInput.current);
    }, delay));
  }, [scrollToFocusedInput]);

  useEffect(() => {
    return () => {
      pendingScrolls.current.forEach((timer) => globalThis.clearTimeout?.(timer));
      pendingScrolls.current = [];
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ revealInput }}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : process.env.EXPO_OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.container}>
        <ScrollView
          {...props}
          ref={scrollViewRef}
          keyboardDismissMode={keyboardDismissMode ?? (process.env.EXPO_OS === 'ios' ? 'interactive' : 'on-drag')}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        />
      </KeyboardAvoidingView>
    </KeyboardContext.Provider>
  );
}

/** TextInput that asks the nearest KeyboardAwareScrollView to reveal it. */
export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>(
  function KeyboardAwareTextInput({ onFocus, ...props }, ref) {
    const keyboardContext = useContext(KeyboardContext);

    return (
      <TextInput
        {...props}
        ref={ref}
        onFocus={(event) => {
          onFocus?.(event);
          const focusedInput = TextInput.State.currentlyFocusedInput() ?? event.target;
          keyboardContext?.revealInput(focusedInput);
        }}
      />
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
