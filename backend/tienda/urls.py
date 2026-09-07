from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as serve_static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Servimos /media/ desde el filesystem local solo cuando no hay un storage
# externo (Cloudflare R2) configurado. Con R2, las imágenes se sirven
# directamente desde su URL pública y este bloque no aplica.
if hasattr(settings, 'MEDIA_ROOT'):
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_static, {'document_root': settings.MEDIA_ROOT}),
    ]
