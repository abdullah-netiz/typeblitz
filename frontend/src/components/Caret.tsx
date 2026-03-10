import { memo } from 'react';

type CaretProps = {
  left: number;
  top: number;
  isTyping: boolean;
};

const Caret = memo(({ left, top, isTyping }: CaretProps) => {
  return (
    <div
      className={`caret ${isTyping ? 'typing' : ''}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    />
  );
});

Caret.displayName = 'Caret';

export default Caret;
