import { redirect } from 'next/navigation'

// La raíz redirige al dashboard; el middleware protegerá si no está autenticado
export default function Home() {
  redirect('/dashboard')
}
