import { Link } from 'react-router-dom'
import { useData } from '../../firebase/store'
import { useToday } from '../../lib/useToday'
import { Meals } from '../today/Meals'
import { SubScreen } from './SubScreen'

/** Les repas du jour et la ration. */
export default function HealthMeals() {
  const { dog } = useData()
  const today = useToday()
  return (
    <SubScreen title="Repas" titleInContent={Boolean(dog.feeding?.meals.length)}>
      {dog.feeding && dog.feeding.meals.length > 0 ? (
        <Meals dogName={dog.name} feeding={dog.feeding} today={today} />
      ) : (
        // Rien de renseigné : le titre de l'écran s'affiche (sinon c'est la carte des repas qui le porte).
        <div className="card flex flex-col items-start gap-3 p-4">
          <p className="text-[1rem] font-semibold">Ses repas ne sont pas encore renseignés.</p>
          <Link to="/questionnaire?etape=repas" className="btn btn-outline">
            Indiquer ses repas
          </Link>
        </div>
      )}
    </SubScreen>
  )
}
