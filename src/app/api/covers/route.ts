import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImgproxyProfiles } from '@/lib/imgproxy';

export const dynamic = 'force-dynamic';

// GET: Obtener las imágenes de portada disponibles para el tenant autenticado
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ covers: [] });
    }

    // 1. Buscar si existe el álbum de portadas (_covers)
    const { data: coverAlbum } = await supabase
      .from('albums')
      .select('id')
      .eq('tenant_id', membership.tenant_id)
      .eq('path', '_covers')
      .single();

    let photosQuery = supabase
      .from('photos')
      .select('id, r2_key, name')
      .eq('tenant_id', membership.tenant_id);

    if (coverAlbum) {
      photosQuery = photosQuery.eq('album_id', coverAlbum.id);
    } else {
      // Fallback: listar las últimas 50 fotos del catálogo para usar como portadas
      photosQuery = photosQuery.limit(50);
    }

    const { data: photos, error } = await photosQuery;

    if (error || !photos) {
      return NextResponse.json({ covers: [] });
    }

    const covers = photos.map((p) => ImgproxyProfiles.cover(p.r2_key));

    return NextResponse.json({ covers });
  } catch (error: any) {
    console.error('Error fetching covers:', error);
    return NextResponse.json({ covers: [] });
  }
}
