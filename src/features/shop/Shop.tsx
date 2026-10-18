import { useState } from 'react'
import { BoneIcon } from '../../components/BoneIcon'
import { CheckIcon, ChevronLeftIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { buttonState, SHOP, SHOP_CATEGORIES, shopItem, slotOf, type ShopCategory, type ShopItem } from '../../content/shop'
import { buyItem, wear } from '../../firebase/shop'
import { useData } from '../../firebase/store'
import { balance, HOW_TO_EARN } from '../../lib/bones'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { ItemArt } from './Art'
import { DogPhoto } from './DogPhoto'

/** La boutique : ce qu’on s’offre avec les os gagnés par ses efforts. */
export default function Shop() {
  const { dog, bones, inventory } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const toast = useToast()
  const [category, setCategory] = useState<ShopCategory>('accessoire')
  const [trying, setTrying] = useState<ShopItem | null>(null)
  const [buying, setBuying] = useState<ShopItem | null>(null)
  const solde = balance(bones)
  const owned = (id: string) => inventory.some((i) => i.id === id)
  const worn = (item: ShopItem) => dog.cosmetics?.[slotOf(item.category)] === item.id
  const wearing = shopItem(dog.cosmetics?.accessory)

  // Toucher un accessoire ou un cadre l’essaie sur l’aperçu, avant de l’acheter.
  const tryOn = trying && (trying.category === 'accessoire' || trying.category === 'cadre') ? { [trying.category === 'accessoire' ? 'accessory' : 'frame']: trying.id } : undefined

  const act = (item: ShopItem) => {
    const state = buttonState(item, owned(item.id), worn(item), solde)
    if (state.kind === 'acheter') return setBuying(item)
    if (state.kind === 'porter') return wear(slotOf(item.category), item.id)
    if (state.kind === 'porte') return wear(slotOf(item.category), undefined)
    setTrying(item)
  }

  const confirm = () => {
    if (!buying) return
    buyItem(buying, today)
    wear(slotOf(buying.category), buying.id)
    toast(`C’est à vous ! ${buying.name}`)
    setBuying(null)
    setTrying(null)
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          L’arbre
        </button>
        <span className="flex items-center gap-1.5 rounded-full bg-[#FFF8E6] px-3.5 py-2 text-[17px] font-extrabold text-gold-dark" aria-label={`${solde} os`}>
          <BoneIcon size={22} />
          {solde}
        </span>
      </header>

      <main className="flex flex-col gap-4 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="font-display text-[28px] font-extrabold">La boutique</h1>

        <section aria-label="Aperçu" className="card flex items-center gap-4 p-4">
          <DogPhoto size={96} tryOn={tryOn} />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-display text-xl font-extrabold">{dog.name}</span>
            <span className="text-[15px] font-semibold text-[#3F4946]">{trying ? `Essaie : ${trying.name.toLocaleLowerCase('fr')}` : wearing ? `Porte : ${wearing.name.toLocaleLowerCase('fr')}` : 'Ne porte rien pour l’instant'}</span>
            <span className="text-[13px] leading-snug text-muted">Touchez un objet pour l’essayer avant de l’acheter.</span>
          </span>
        </section>

        <div role="group" aria-label="Catégories" className="scroll-row -mx-5 flex gap-2 px-5 pb-1">
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`min-h-12 shrink-0 rounded-full px-4 text-[15px] font-bold whitespace-nowrap ${category === c.id ? 'border-0 bg-primary text-white' : 'border-2 border-solid border-border bg-surface text-text'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SHOP.filter((i) => i.category === category && (!i.earned || owned(i.id))).map((item) => {
            const state = buttonState(item, owned(item.id), worn(item), solde)
            return (
              <div key={item.id} className="card flex flex-col items-center gap-2 p-3 text-center">
                <button type="button" onClick={() => setTrying(item)} aria-label={`Essayer : ${item.name}`} className="flex min-h-[92px] w-full items-center justify-center rounded-2xl border-0 bg-bg p-2">
                  <ItemArt id={item.id} category={item.category} />
                </button>
                <span className="text-[15px] leading-tight font-bold">{item.name}</span>
                {owned(item.id) && <span className="text-[13px] font-semibold text-primary">À vous</span>}
                {/* Le bouton est collé en bas : sur une même rangée, les boutons sont à la même hauteur. */}
                <button
                  type="button"
                  onClick={() => act(item)}
                  disabled={state.kind === 'manque'}
                  className={`mt-auto flex min-h-11 w-full items-center justify-center gap-1 rounded-full px-2 text-[15px] font-bold ${
                    state.kind === 'acheter'
                      ? 'border-2 border-solid border-gold bg-[#FFF8E6] text-gold-dark'
                      : state.kind === 'porter'
                        ? 'border-2 border-solid border-primary bg-surface text-primary'
                        : state.kind === 'porte'
                          ? 'border-0 bg-primary text-white'
                          : 'border-0 bg-[#EEF0EE] text-muted'
                  }`}
                >
                  {state.kind === 'acheter' && (
                    <>
                      Acheter · {state.price}
                      <BoneIcon size={16} />
                    </>
                  )}
                  {state.kind === 'porter' && 'Porter'}
                  {state.kind === 'porte' && (
                    <>
                      Porté
                      <CheckIcon size={16} strokeWidth={3} />
                    </>
                  )}
                  {state.kind === 'manque' && (
                    <>
                      Encore {state.missing}
                      <BoneIcon size={16} />
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <section className="card mt-2 flex flex-col gap-2 p-4">
          <h2 className="text-[17px] font-bold">Comment gagner des os</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {HOW_TO_EARN.map((row, i) => (
              <li key={row.label} className={`flex items-center justify-between gap-3 py-2 text-[15px] ${i ? 'border-t border-divider' : ''}`}>
                <span>{row.label}</span>
                <span className="flex shrink-0 items-center gap-1 font-bold text-gold-dark">
                  +{row.amount}
                  <BoneIcon size={16} />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[15px] leading-snug text-muted">Les os récompensent vos efforts, pas ce que {dog.name} sait faire : ils ne se perdent jamais.</p>
        </section>
      </main>

      {buying && (
        <Sheet label={`Acheter : ${buying.name}`} onClose={() => setBuying(null)}>
          <div className="flex items-center gap-4">
            <ItemArt id={buying.id} category={buying.category} />
            <span className="flex flex-col gap-1">
              <span className="font-display text-[22px] font-extrabold">{buying.name}</span>
              <span className="flex items-center gap-1 text-[17px] font-bold text-gold-dark">
                {buying.price}
                <BoneIcon size={18} />
                <span className="font-normal text-muted">· il vous restera {solde - buying.price}</span>
              </span>
            </span>
          </div>
          <button type="button" onClick={confirm} className="btn btn-main mt-2 min-h-[56px]">
            Acheter
          </button>
          <button type="button" onClick={() => setBuying(null)} className="btn btn-outline">
            Pas maintenant
          </button>
        </Sheet>
      )}
    </div>
  )
}
