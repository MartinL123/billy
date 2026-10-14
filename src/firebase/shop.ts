import { deleteField, updateDoc, writeBatch } from 'firebase/firestore'
import type { ShopItem } from '../content/shop'
import { purchaseBone } from '../lib/bones'
import type { ISODate } from '../lib/dates'
import { db } from './app'
import { send, userDoc } from './paths'

/** Acheter un objet : il rejoint l'inventaire, et ses os sont dépensés (une seule fois par objet). */
export function buyItem(item: ShopItem, date: ISODate): void {
  const batch = writeBatch(db)
  const spent = purchaseBone(item.id, item.price, date)
  batch.set(userDoc('inventory', item.id), { boughtAt: new Date().toISOString(), price: item.price })
  batch.set(userDoc('bones', spent.id), { date: spent.date, amount: spent.amount, reason: spent.reason, refId: spent.refId })
  send(batch.commit())
}

/** Porter un objet (ou l'enlever) : un seul par emplacement (accessoire, cadre, fond, sticker, couleurs). */
export function wear(slot: 'accessory' | 'frame' | 'background' | 'sticker' | 'theme', itemId: string | undefined): void {
  send(updateDoc(userDoc('dog', 'billy'), { [`cosmetics.${slot}`]: itemId ?? deleteField() }))
}
