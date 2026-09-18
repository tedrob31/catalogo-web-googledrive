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

    // 1. Buscar si existen álbumes de portadas (_covers y sus subcarpetas)
    const { data: coverAlbums } = await supabase
      .from('albums')
      .select('id')
      .eq('tenant_id', membership.tenant_id)
      .or('path.eq._covers,path.like._covers/%');

    let photosQuery = supabase
      .from('photos')
      .select('id, r2_key, name, album_id')
      .eq('tenant_id', membership.tenant_id);

    if (coverAlbums && coverAlbums.length > 0) {
      const coverIds = coverAlbums.map((a) => a.id);
      photosQuery = photosQuery.in('album_id', coverIds);
    } else {
      // Fallback: listar las fotos del catálogo si no hay carpeta específica de portadas
      photosQuery = photosQuery.limit(100);
    }

    const { data: photos, error } = await photosQuery;

    if (error || !photos) {
      return NextResponse.json({ covers: [], photos: [] });
    }

    const covers = photos.map((p) => ImgproxyProfiles.cover(p.r2_key));
    const detailed = photos.map((p) => ({
      id: p.id,
      album_id: p.album_id,
      name: p.name,
      r2_key: p.r2_key,
      url: ImgproxyProfiles.cover(p.r2_key),
      thumbnailUrl: ImgproxyProfiles.thumbnail(p.r2_key),
    }));

    return NextResponse.json({ covers, photos: detailed });
  } catch (error: any) {
    console.error('Error fetching covers:', error);
    return NextResponse.json({ covers: [], photos: [] });
  }
}
