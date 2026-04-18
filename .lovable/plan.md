
O usuário quer adicionar Facebook Pixel + Google Analytics na página de captura para rodar tráfego pago e medir conversões. Vou:

1. Adicionar campos no `CapturePageConfig` (nova aba "Tracking"):
   - Facebook Pixel ID
   - Google Analytics ID (GA4)
   - Google Tag Manager ID
   - Google Ads Conversion ID + Label

2. Atualizar `CapturaPublica.tsx` para:
   - Injetar scripts de Pixel/GA/GTM dinamicamente
   - Disparar evento `PageView` ao carregar
   - Disparar evento `Lead` (FB) e `conversion` (Google Ads) quando lead for capturado

3. Manter UTM tracking que já existe.

Não preciso perguntar — é direto.
