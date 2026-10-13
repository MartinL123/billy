import { useEffect, useState } from 'react'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { FormScreen, Optional, TextField } from '../../components/Form'
import { TrashIcon } from '../../components/Icons'
import { saveDog } from '../../firebase/db'
import { deleteFile, saveImage } from '../../firebase/files'
import type { Contact, Dog, WithId } from '../../firebase/types'
import { isValidISO } from '../../lib/dates'
import { TRAITS, type Trait } from '../../content/training'
import { sortMeals, type Meal } from '../../lib/feeding'
import { compressImage, PHOTO, type CompressedImage } from '../../lib/image'
import { useToday } from '../../lib/useToday'

const contact = (name: string, phone: string): Contact | undefined => (name.trim() || phone.trim() ? { name: name.trim(), phone: phone.trim() } : undefined)

export function ProfileEdit({ dog, onClose }: { dog: WithId<Dog>; onClose: () => void }) {
  const today = useToday()
  const [name, setName] = useState(dog.name)
  const [breed, setBreed] = useState(dog.breed)
  const [birthDate, setBirthDate] = useState(dog.birthDate)
  const [adoptionDate, setAdoptionDate] = useState(dog.adoptionDate)
  const [chip, setChip] = useState(dog.chip ?? '')
  const [vetName, setVetName] = useState(dog.vet?.name ?? '')
  const [vetPhone, setVetPhone] = useState(dog.vet?.phone ?? '')
  const [trainerName, setTrainerName] = useState(dog.trainer?.name ?? '')
  const [trainerPhone, setTrainerPhone] = useState(dog.trainer?.phone ?? '')
  const [grams, setGrams] = useState(dog.feeding ? String(dog.feeding.gramsPerDay) : '')
  const [meals, setMeals] = useState<Meal[]>(() => sortMeals(dog.feeding?.meals ?? []))
  // Les traits ne se cochent plus : ils sont déduits du questionnaire, et conservés tels quels ici.
  const traits: Trait[] = dog.traits ?? []
  const [photo, setPhoto] = useState<(CompressedImage & { previewUrl: string }) | null>(null)
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; adoptionDate?: string; photo?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.previewUrl)), [photo])

  const choosePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      const compressed = await compressImage(file, PHOTO)
      setPhoto({ ...compressed, previewUrl: URL.createObjectURL(compressed.thumb) })
      setErrors((e) => ({ ...e, photo: undefined }))
    } catch (err) {
      setErrors((e) => ({ ...e, photo: err instanceof Error ? err.message : 'Photo illisible.' }))
    }
  }

  const save = async () => {
    const found: typeof errors = {}
    if (!name.trim()) found.name = 'Le nom ne peut pas être vide.'
    if (!isValidISO(birthDate)) found.birthDate = 'Choisis une date.'
    if (!isValidISO(adoptionDate)) found.adoptionDate = 'Choisis une date.'
    setErrors(found)
    if (Object.keys(found).length) return
    const gramsPerDay = Math.max(0, Math.round(Number(grams.replace(',', '.')) || 0))
    setSaving(true)
    let { photoFileId, photoThumbFileId } = dog
    if (photo) {
      photoFileId = await saveImage(photo.full)
      photoThumbFileId = await saveImage(photo.thumb)
      deleteFile(dog.photoFileId)
      deleteFile(dog.photoThumbFileId)
    }
    saveDog({
      name: name.trim(),
      breed: breed.trim(),
      birthDate,
      adoptionDate,
      chip: chip.trim() || undefined,
      vet: contact(vetName, vetPhone),
      trainer: contact(trainerName, trainerPhone),
      photoFileId,
      photoThumbFileId,
      feeding: gramsPerDay || meals.length ? { gramsPerDay, meals: sortMeals(meals.filter((m) => m.time)) } : undefined,
      traits: TRAITS.map((t) => t.id).filter((id) => traits.includes(id)),
      questionnaire: dog.questionnaire,
      fears: dog.fears,
      fearsOther: dog.fearsOther,
      seedVersion: dog.seedVersion,
    })
    onClose()
  }

  return (
    <FormScreen title="Modifier le profil" submitLabel="Enregistrer" busy={saving} onCancel={onClose} onSubmit={() => void save()}>
      <div className="flex flex-col items-center gap-2">
        {photo ? (
          <img src={photo.previewUrl} alt="Nouvelle photo" className="size-[120px] rounded-full border-4 border-white object-cover shadow-[0_2px_8px_rgba(24,32,30,0.12)]" />
        ) : dog.photoThumbFileId ? (
          <FileImage fileId={dog.photoThumbFileId} alt={`Photo de ${dog.name}`} className="size-[120px] rounded-full border-4 border-white shadow-[0_2px_8px_rgba(24,32,30,0.12)]" eager />
        ) : (
          <div className="flex size-[120px] items-center justify-center rounded-full border-4 border-white bg-milestone-soft font-display text-5xl font-bold text-milestone-dark">
            {dog.name.charAt(0).toUpperCase()}
          </div>
        )}
        <FilePicker accept="image/*" multiple={false} onFiles={(files) => void choosePhoto(files)} className="flex h-11 items-center px-3 text-base font-semibold text-primary">
          {photo || dog.photoThumbFileId ? 'Changer la photo' : 'Choisir une photo'}
        </FilePicker>
        {errors.photo && (
          <div role="alert" className="text-center text-sm font-medium text-danger">
            {errors.photo}
          </div>
        )}
      </div>

      <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" />
      <TextField label="Race" value={breed} onChange={(e) => setBreed(e.target.value)} autoComplete="off" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Naissance" type="date" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} error={errors.birthDate} className="px-3" />
        <TextField label="Adoption" type="date" max={today} value={adoptionDate} onChange={(e) => setAdoptionDate(e.target.value)} error={errors.adoptionDate} className="px-3" />
      </div>
      <TextField
        label={
          <>
            Numéro de puce
            <Optional />
          </>
        }
        inputMode="numeric"
        autoComplete="off"
        placeholder="15 chiffres"
        value={chip}
        onChange={(e) => setChip(e.target.value)}
      />

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[19px] font-bold">Alimentation</legend>
        <TextField label="Ration par jour (grammes)" inputMode="numeric" autoComplete="off" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d]/g, ''))} />
        {meals.map((meal, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_130px] items-end gap-2">
            <TextField
              label={`Repas ${i + 1}`}
              value={meal.label}
              autoComplete="off"
              onChange={(e) => setMeals(meals.map((m, j) => (j === i ? { ...m, label: e.target.value } : m)))}
            />
            <TextField
              label="Heure"
              type="time"
              value={meal.time}
              className="px-3"
              onChange={(e) => setMeals(meals.map((m, j) => (j === i ? { ...m, time: e.target.value } : m)))}
            />
            <button
              type="button"
              aria-label={`Retirer le repas ${i + 1}`}
              onClick={() => setMeals(meals.filter((_, j) => j !== i))}
              className="btn btn-quiet col-span-2 min-h-12"
            >
              <TrashIcon size={20} />
              Retirer ce repas
            </button>
          </div>
        ))}
        {meals.length < 4 && (
          <button
            type="button"
            onClick={() => setMeals([...meals, { label: 'Repas', time: '12:00' }])}
            className="h-12 rounded-full border-[1.5px] border-dashed border-[#9AA39F] bg-transparent text-[15px] font-semibold text-primary"
          >
            Ajouter un repas
          </button>
        )}
        <p className="text-[13px] leading-snug text-muted">Après un changement d'heure, retouche « Recevoir les rappels sur l'iPhone » sur l'accueil pour mettre les rappels à jour.</p>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[19px] font-bold">Vétérinaire</legend>
        <TextField label="Nom" value={vetName} onChange={(e) => setVetName(e.target.value)} autoComplete="off" placeholder="Dr…, clinique…" />
        <TextField label="Téléphone" type="tel" inputMode="tel" autoComplete="off" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} />
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-2.5 p-0 text-[19px] font-bold">Éducateur</legend>
        <TextField label="Nom" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} autoComplete="off" />
        <TextField label="Téléphone" type="tel" inputMode="tel" autoComplete="off" value={trainerPhone} onChange={(e) => setTrainerPhone(e.target.value)} />
      </fieldset>
    </FormScreen>
  )
}
