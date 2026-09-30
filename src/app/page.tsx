import LandingClassic from '@/components/landing/LandingClassic';
import LandingMinimal from '@/components/landing/LandingMinimal';
import { getSystemSettings } from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'c4talogo.com | Tu Catálogo Digital conectado a Google Drive',
  description:
    'Sincroniza tus fotos de Google Drive y crea un catálogo profesional para tus clientes con subdominio propio en minutos.',
};

export default async function LandingPage() {
  const settings = await getSystemSettings();

  if (settings.active_landing === 'classic') {
    return <LandingClassic />;
  }

  return <LandingMinimal />;
}
