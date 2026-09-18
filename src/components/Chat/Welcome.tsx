import logo from "../../ds/assets/logo-mark.webp";
import Icon from "../common/Icon";
import { useAppStore } from "../../store/appStore";

interface WelcomeProps {
  onSend: (text: string) => void;
  onDraft: (text: string) => void;
}

/** Leerer Zustand eines Gesprächs: Anrede, was der Assistent kann, zwei Einstiege. */
export default function Welcome({ onSend, onDraft }: WelcomeProps) {
  const user = useAppStore((s) => s.user);
  const ai = useAppStore((s) => s.ai);
  const groups = useAppStore((s) => s.userGroups);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="welcome">
      <img className="welcome__logo" src={ai.avatar ?? logo} alt="" />
      <h2 className="welcome__title">
        {greeting}{user.firstName ? `, ${user.firstName}` : ""}.
      </h2>
      <p className="welcome__sub">
        {ai.name} beantwortet Fragen zu den Dokumenten Ihres Unternehmens und nennt zu jeder Antwort die Quelle mit Seite.
      </p>
      <div className="welcome__chips">
        <button type="button" className="skill" onClick={() => onSend("Welche Themen decken die verfügbaren Dokumente ab?")}>
          <Icon name="book" />
          Welche Themen gibt es?
        </button>
        <button type="button" className="skill" onClick={() => onDraft("Wie gehe ich vor, wenn ")}>
          <Icon name="doc" />
          Vorgehen nachschlagen
        </button>
        <button type="button" className="skill" onClick={() => onDraft("Fassen Sie das Wichtigste zu … zusammen.")}>
          <Icon name="bolt" />
          Zusammenfassung anfordern
        </button>
      </div>
      {groups.length > 0 && (
        <div className="welcome__groups" aria-label="Ihre Wissensbereiche">
          {groups.map((g) => <span key={g} className="badge badge--neutral badge--plain">{g}</span>)}
        </div>
      )}
    </div>
  );
}
