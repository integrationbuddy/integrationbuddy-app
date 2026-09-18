/** Drei Punkte nach Design-System `.chat__typing`, nur während die Antwort entsteht. */
export default function TypingIndicator() {
  return (
    <div className="msg msg--assistant">
      <p className="chat__typing" aria-label="Antwort wird geschrieben"><i /><i /><i /></p>
    </div>
  );
}
