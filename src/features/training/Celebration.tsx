import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileImage } from "../../components/FileImage";
import {
  levelTitle,
  stepPhraseLower,
  territoryOf,
} from "../../content/phrases";
import { Badge } from "../billy/Badge";
import { bossById, MAX_LEVEL } from "../../content/training";

/** Confettis aux couleurs du territoire : ils tombent dans le haut de l'écran, jamais sur les boutons. */
function Confetti({ colors, count }: { colors: string[]; count: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[55%] overflow-hidden"
    >
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 37) % 92) + 4;
        const style = {
          left: `${left}%`,
          background: colors[i % colors.length],
          width: i % 3 === 0 ? 8 : 10,
          height: i % 3 === 0 ? 14 : 8,
          borderRadius: i % 4 === 0 ? 999 : 2,
          "--delay": `${(i % 5) * 0.06}s`,
          "--dx": `${((i * 53) % 60) - 30}px`,
          "--fall": `${34 + ((i * 29) % 18)}vh`,
          "--rot": `${((i * 97) % 360) + 180}deg`,
        } as CSSProperties;
        return <span key={i} className="cel-confetti" style={style} />;
      })}
    </span>
  );
}

/** Plein écran de récompense. Un toucher n'importe où passe l'animation ; « Continuer » ferme. */
function FullScreen({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [skip, setSkip] = useState(false);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={() => setSkip(true)}
      className={`fixed inset-0 z-50 flex flex-col items-center overflow-x-hidden overflow-y-auto bg-primary-dark px-7 pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-center text-white ${skip ? "cel-skip" : ""}`}
    >
      {children}
    </div>,
    document.body,
  );
}

const continueButton =
  "mt-auto flex min-h-[60px] w-full shrink-0 items-center justify-center rounded-full border-0 bg-gold text-[19px] font-extrabold text-gold-dark";
const pill = "rounded-2xl bg-white/15 px-3.5 py-2 text-base font-bold";

/** Nouvelle étape : « C'est réussi ! », la phrase de l'étape en grand, la suivante. Ni étoile ni compteur. */
export function StepSuccess({
  dogName,
  bossId,
  level,
  inCarnet = true,
  onClose,
}: {
  dogName: string;
  bossId: string;
  level: number;
  inCarnet?: boolean;
  onClose: () => void;
}) {
  const boss = bossById(bossId);
  const territory = territoryOf(bossId);
  return (
    <FullScreen label="C'est réussi">
      <Confetti
        colors={[territory.color, territory.soft, "#F2B544", "#FFFFFF"]}
        count={14}
      />
      <span className="cel-badge flex size-40 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
        <Badge
          bossId={bossId}
          acquired={level}
          size={136}
          animateStep={level}
          lit="#F2B544"
        />
      </span>
      <div className="cel-text flex w-full flex-1 flex-col items-center">
        <p className="mt-7 text-[15px] font-bold tracking-[1px] text-[#F7D58A] uppercase">
          C'est réussi ! · {boss?.name}
        </p>
        <h1 className="mt-3 font-display text-[30px] leading-tight font-extrabold">
          {dogName} {stepPhraseLower(bossId, level)}
        </h1>
        {level < MAX_LEVEL && (
          <div className="mt-6 flex w-full flex-col gap-1 rounded-[18px] bg-white/10 px-4 py-3.5 text-left">
            <span className="text-[13px] font-bold tracking-[0.6px] text-[#F7D58A] uppercase">
              Prochaine étape
            </span>
            <span className="text-[17px] leading-snug">
              {stepPhraseLower(bossId, level + 1).replace(/^./, (c) =>
                c.toLocaleUpperCase("fr"),
              )}
            </span>
          </div>
        )}
        <div className="mt-4 mb-6 flex flex-wrap justify-center gap-2.5">
          <span className={pill}>▲ {boss?.name} avance</span>
          {inCarnet && <span className={pill}>Ajouté au Carnet</span>}
        </div>
        <button type="button" onClick={onClose} className={continueButton}>
          Continuer
        </button>
      </div>
    </FullScreen>
  );
}

/** Nouveau niveau : la photo de Billy, son nouveau titre. */
export function LevelUp({
  dogName,
  level,
  photoFileId,
  onClose,
}: {
  dogName: string;
  level: number;
  photoFileId?: string;
  onClose: () => void;
}) {
  return (
    <FullScreen label="Nouveau niveau">
      <Confetti colors={["#F2B544", "#F7D58A", "#FFFFFF"]} count={12} />
      <span className="cel-badge flex size-44 shrink-0 items-center justify-center rounded-full border-[6px] border-solid border-gold bg-white/10">
        {photoFileId ? (
          <FileImage
            fileId={photoFileId}
            alt=""
            className="size-full rounded-full"
            eager
          />
        ) : (
          <span className="font-display text-7xl font-extrabold">
            {dogName.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <div
        className="cel-text flex w-full flex-1 flex-col items-center"
        style={{ animationDelay: "0.5s" }}
      >
        <p className="mt-7 text-[15px] font-bold tracking-[1px] text-[#F7D58A] uppercase">
          Nouveau niveau
        </p>
        <h1 className="mt-3 font-display text-[40px] leading-tight font-extrabold">
          Niveau {level} !
        </h1>
        <p className="mt-2 text-xl leading-snug">
          {dogName} devient{" "}
          <span className="font-bold text-[#F7D58A]">{levelTitle(level)}</span>
        </p>
        <div className="mt-5 mb-6 flex justify-center">
          <span className={pill}>Ajouté au Carnet</span>
        </div>
        <button type="button" onClick={onClose} className={continueButton}>
          Continuer
        </button>
      </div>
    </FullScreen>
  );
}
