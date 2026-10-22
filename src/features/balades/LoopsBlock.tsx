import type { RefObject } from 'react'
import type { Loop } from '../../lib/loops'
import { RouteMap } from './JournalWalkCard'

/** « Facile · chiot » → « facile » : la carte est petite (maquette V6-Billy-et-journal). */
export const loopLevelShort = (loop: Loop) => loop.level.split(' · ')[0]!.toLowerCase()

/**
 * « Idées de balade » (V6.1 § 4, ex-« Boucles pour Billy », T-089) : jusqu’à 3 de ses balades passées qui partent près
 * d’ici (≈ 15, 30, 45 min), en petites cartes côte à côte ; « Masquer » les retire (réaffichables dans « Affichage »).
 * Pas de phrase d’explication. Toucher une idée la montre sur la carte (le panneau descend). Sans idée : rien.
 */
export function LoopsBlock({ loops, picked, onPick, onHide, headRef }: { loops: Loop[]; picked?: string; onPick: (loop: Loop) => void; onHide: () => void; headRef?: RefObject<HTMLDivElement | null> }) {
  if (loops.length === 0) return null
  return (
    <section aria-labelledby="idees-titre" className="flex flex-col gap-2">
      <div ref={headRef} className="flex items-center justify-between gap-3">
        <h2 id="idees-titre" className="title-card">
          Idées de balade
        </h2>
        <button type="button" onClick={onHide} className="-mr-2 min-h-11 border-0 bg-transparent px-2 text-[0.8235rem] font-bold text-primary">
          Masquer
        </button>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-1.5 p-0">
        {loops.map((loop) => (
          <li key={loop.item.id} className="min-w-0">
            <button
              type="button"
              aria-pressed={picked === loop.item.id}
              onClick={() => onPick(loop)}
              aria-label={`${loop.item.name}, environ ${loop.duration} minutes, ${loopLevelShort(loop)}. La voir sur la carte`}
              className={`tap flex h-full w-full flex-col overflow-hidden rounded-field border-2 border-solid bg-bg p-0 text-left text-text ${picked === loop.item.id ? 'border-primary' : 'border-transparent'}`}
            >
              <RouteMap route={{ points: loop.item.route.points, moments: [] }} height={58} pad={9} />
              <span className="flex min-w-0 flex-col px-2 pt-1.5 pb-2 text-[0.7647rem] leading-tight text-[#3F4946]">
                <b className="line-clamp-2 text-[0.8235rem] text-text">{loop.item.name}</b>
                <span>
                  {loop.duration}
                  {' '}min · {loopLevelShort(loop)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
