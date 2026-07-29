import { Order } from '../types';

export function adjustColor(hex: string, amt: number): string {
  let c = hex.replace('#', '');
  let num = parseInt(c, 16);
  let r = Math.max(0, Math.min(255, (num >> 16) + amt));
  let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  let b = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateReceipt(order: Order): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 800, 1000);
  ctx.strokeStyle = '#e91e63';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 784, 984);
  ctx.fillStyle = '#111';
  ctx.font = '900 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DJASSA REÇU', 400, 90);
  ctx.fillStyle = '#e91e63';
  ctx.font = '700 22px Arial';
  ctx.fillText('Paiement Sécurisé • Bloqué 24h', 400, 130);

  const img = new Image();
  img.src = order.productImage;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
  });

  const iw = 700, ih = 380;
  ctx.save();
  roundRect(ctx, 50, 170, iw, ih, 20);
  ctx.clip();
  ctx.drawImage(img, 50, 170, iw, ih);
  ctx.restore();
  ctx.strokeStyle = '#eee';
  ctx.lineWidth = 2;
  roundRect(ctx, 50, 170, iw, ih, 20);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#222';
  let y = 610;
  const renderLine = (label: string, val: string, bold = false) => {
    ctx.font = '600 22px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(label, 60, y);
    ctx.font = (bold ? '900 ' : '700 ') + '26px Arial';
    ctx.fillStyle = '#111';
    ctx.fillText(val, 60, y + 34);
    y += 80;
  };

  renderLine('ID COMMANDE', order.id, true);
  renderLine('VENDEUSE', '@' + order.seller);
  renderLine('PRODUIT', order.productName);
  renderLine('MONTANT', order.amount.toLocaleString('fr-FR') + ' FCFA via ' + order.method, true);
  renderLine('ACHETEUR', order.buyerName);

  ctx.fillStyle = '#999';
  ctx.font = '600 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(new Date(order.timestamp).toLocaleString('fr-FR'), 400, 940);
  ctx.fillStyle = '#e91e63';
  ctx.font = '900 20px Arial';
  ctx.fillText('djassa.live • Bloqué 24h avant livraison', 400, 975);

  return canvas.toDataURL('image/png');
}
