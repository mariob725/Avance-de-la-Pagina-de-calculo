const $ = id => document.getElementById(id);
$('fin').value = new Date().toISOString().slice(0,10);
const fmt = n => '$' + (isFinite(n)?n:0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

function serviceSpan(start,end){
  if(end<start) return null;
  let years=end.getFullYear()-start.getFullYear();
  let months=end.getMonth()-start.getMonth();
  let days=end.getDate()-start.getDate();
  if(days<0){months-=1; days+=new Date(end.getFullYear(),end.getMonth(),0).getDate();}
  if(months<0){years-=1; months+=12;}
  const totalDays=Math.round((end-start)/86400000);
  const lastAnniv=new Date(start); lastAnniv.setFullYear(start.getFullYear()+years);
  const daysSinceAnniv=Math.max(0,Math.round((end-lastAnniv)/86400000));
  return {years,months,days,totalDays,fraction:daysSinceAnniv/365};
}
function aguinaldoDias(years){ return years>=10?21:years>=3?19:15; }

// ---- número a letras (USD) ----
const UNI=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte'];
const DEC=['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CEN=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function tresDigitos(n){
  if(n===0) return '';
  if(n===100) return 'cien';
  let s='';
  const c=Math.floor(n/100), r=n%100;
  if(c) s+=CEN[c]+' ';
  if(r<=20) s+=UNI[r];
  else{
    const d=Math.floor(r/10), u=r%10;
    s+=DEC[d]+(u?' y '+UNI[u]:'');
  }
  return s.trim();
}
function enteroALetras(n){
  if(n===0) return 'cero';
  let out=[];
  const millones=Math.floor(n/1000000); n%=1000000;
  const miles=Math.floor(n/1000); n%=1000;
  if(millones) out.push(millones===1?'un millón':tresDigitos(millones)+' millones');
  if(miles) out.push(miles===1?'mil':tresDigitos(miles)+' mil');
  if(n) out.push(tresDigitos(n));
  return out.join(' ').trim();
}
function montoALetras(valor){
  const entero=Math.floor(valor+1e-6);
  const centavos=Math.round((valor-entero)*100);
  const cad=entero===1?'un dólar':enteroALetras(entero)+' dólares';
  return (cad.charAt(0).toUpperCase()+cad.slice(1))+' con '+String(centavos).padStart(2,'0')+'/100 US$';
}

function isr(base){
  if(base<=550) return 0;
  if(base<=895.24) return (base-550)*0.10+17.67;
  if(base<=2038.10) return (base-895.24)*0.20+60.00;
  return (base-2038.10)*0.30+228.57;
}

function calcular(){
  const nombre=$('nombre').value, dui=$('dui').value, cargo=$('cargo').value, patrono=$('patrono').value;
  const salario=parseFloat($('salario').value)||0;
  const salMinMensual=parseFloat($('sector').value);
  const ingreso=new Date($('ingreso').value), fin=new Date($('fin').value);
  const motivo=$('motivo').value;
  const hed=parseFloat($('hed').value)||0, hen=parseFloat($('hen').value)||0;
  const dAsueto=parseFloat($('asueto').value)||0, dDescanso=parseFloat($('descanso').value)||0;
  const box=$('results'), foot=$('footnote');

  if(isNaN(ingreso)||isNaN(fin)||fin<ingreso){
    box.innerHTML='<div class="r-row"><span>Revisá las fechas de ingreso y finalización.</span></div>';
    foot.textContent=''; return null;
  }

  const span=serviceSpan(ingreso,fin);
  const salDiario=salario/30;
  const salMinDiario=salMinMensual/30;
  const valorHora=salDiario/8;

  // Prestaciones proporcionales (fracción desde el último aniversario)
  const vacacion=salDiario*15*1.30*span.fraction;
  const aguinaldo=salDiario*aguinaldoDias(span.years)*span.fraction;

  // Indemnización / compensación
  let indem=0, indemLabel='', indemNota='';
  if(motivo==='injustificado'){
    const baseDiaria=Math.min(salDiario,4*salMinDiario);
    indem=baseDiaria*30*span.years + baseDiaria*30*span.fraction;
    indemLabel='Indemnización por despido injustificado';
    indemNota = salDiario>4*salMinDiario ? `30 días por año, salario topado a 4× salario mínimo diario ($${(4*salMinDiario).toFixed(2)}/día) — Art. 58 C.T.` : '30 días de salario por cada año de servicio y su fracción — Art. 58 C.T.';
  } else {
    indemLabel='Prestación por renuncia voluntaria';
    if(span.years<2){
      indemNota='No aplica: la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria exige un mínimo de 2 años de servicio continuo (Arts. 5 y 8).';
    } else {
      const baseDiaria=Math.min(salDiario,2*salMinDiario);
      indem=baseDiaria*15*span.years + baseDiaria*15*span.fraction;
      indemNota = salDiario>2*salMinDiario ? `15 días por año, salario topado a 2× salario mínimo diario ($${(2*salMinDiario).toFixed(2)}/día) — Art. 8, Decreto 592.` : '15 días de salario por cada año de servicio y su fracción — Art. 8, Decreto 592.';
    }
  }

  // Recargos por jornadas especiales
  const pagoHED=hed*valorHora*2;
  const pagoHEN=hen*valorHora*1.25*2;
  const pagoAsueto=dAsueto*salDiario*2;
  const pagoDescanso=dDescanso*salDiario*1.5;
  const totalRecargos=pagoHED+pagoHEN+pagoAsueto+pagoDescanso;

  const totalPrestaciones=vacacion+aguinaldo+indem;
  const totalDevengado=totalPrestaciones+totalRecargos;

  // Deducciones (aguinaldo, indemnización/renuncia exentos; vacación y recargos gravados)
  const gravable=vacacion+totalRecargos;
  const isssBase=gravable*0.03;
  const isssMonto=Math.min(isssBase,30.00);
  const afpMonto=gravable*0.0725;
  const baseISR=Math.max(0,gravable-isssMonto-afpMonto);
  const isrMonto=isr(baseISR);
  const totalDeducciones=isssMonto+afpMonto+isrMonto;
  const neto=totalDevengado-totalDeducciones;

  box.innerHTML = `
    <div class="rgroup"><h3>Prestaciones proporcionales</h3>
      <div class="r-row"><span>Tiempo de servicio<span class="detail">${span.years} año(s), ${span.months} mes(es), ${span.days} día(s)</span></span><span class="amount">—</span></div>
      <div class="r-row"><span>Vacación proporcional<span class="detail">15 días + 30% recargo, fracción de año en curso</span></span><span class="amount">${fmt(vacacion)}</span></div>
      <div class="r-row"><span>Aguinaldo proporcional<span class="detail">${aguinaldoDias(span.years)} días según antigüedad, fracción de año en curso</span></span><span class="amount">${fmt(aguinaldo)}</span></div>
      <div class="r-row"><span>${indemLabel}<span class="detail">${indemNota}</span></span><span class="amount">${fmt(indem)}</span></div>
    </div>
    <div class="rgroup"><h3>Recargos por jornadas especiales</h3>
      <div class="r-row"><span>Horas extra diurnas (100%)<span class="detail">${hed} h × ${fmt(valorHora)} × 2</span></span><span class="amount">${fmt(pagoHED)}</span></div>
      <div class="r-row"><span>Horas extra nocturnas<span class="detail">${hen} h, base con 25% nocturnidad × 2</span></span><span class="amount">${fmt(pagoHEN)}</span></div>
      <div class="r-row"><span>Días de asueto trabajados (100%)<span class="detail">${dAsueto} día(s)</span></span><span class="amount">${fmt(pagoAsueto)}</span></div>
      <div class="r-row"><span>Descanso semanal trabajado (50%)<span class="detail">${dDescanso} día(s)</span></span><span class="amount">${fmt(pagoDescanso)}</span></div>
    </div>
    <div class="r-row total"><span>Total devengado (bruto)</span><span class="amount">${fmt(totalDevengado)}</span></div>
    <div class="rgroup"><h3>Deducciones de ley</h3>
      <div class="r-row neg"><span>ISSS (3%, tope $30.00)<span class="detail">sobre remuneración gravada de ${fmt(gravable)}</span></span><span class="amount">-${fmt(isssMonto)}</span></div>
      <div class="r-row neg"><span>AFP (7.25%)</span><span class="amount">-${fmt(afpMonto)}</span></div>
      <div class="r-row neg"><span>ISR<span class="detail">sobre base gravable de ${fmt(baseISR)} tras ISSS y AFP</span></span><span class="amount">-${fmt(isrMonto)}</span></div>
    </div>
    <div class="r-row total"><span>Neto a pagar</span><span class="amount">${fmt(neto)}</span></div>
    <div class="letras">${montoALetras(Math.max(0,neto))}</div>
  `;
  foot.textContent = motivo==='injustificado'
    ? 'La indemnización por despido injustificado es la única compensación de las dos que puede coexistir con recargos por jornadas especiales pendientes de pago.'
    : 'La prestación por renuncia voluntaria requiere preaviso escrito de 15 días y al menos 2 años de servicio continuo para proceder.';

  return {nombre,dui,cargo,patrono,salario,span,vacacion,aguinaldo,indem,indemLabel,indemNota,
    pagoHED,pagoHEN,pagoAsueto,pagoDescanso,totalRecargos,totalDevengado,
    isssMonto,afpMonto,isrMonto,totalDeducciones,neto,gravable};
}

function buildPrintSheet(d){
  if(!d) return;
  const hoy=new Date().toLocaleDateString('es-SV',{year:'numeric',month:'long',day:'numeric'});
  $('printSheet').innerHTML = `
  <div class="p-page pagebreak">
    <div class="p-head"><h2>Comprobante de Liquidación de Prestaciones Laborales</h2><div>${hoy}</div></div>
    <p><b>Trabajador(a):</b> ${d.nombre} &nbsp; <b>DUI:</b> ${d.dui}<br>
    <b>Cargo:</b> ${d.cargo} &nbsp; <b>Patrono / Empresa:</b> ${d.patrono}<br>
    <b>Salario mensual:</b> ${fmt(d.salario)} &nbsp; <b>Tiempo de servicio:</b> ${d.span.years} año(s), ${d.span.months} mes(es), ${d.span.days} día(s)</p>

    <table class="p-table"><tr><th>Concepto</th><th>Detalle</th><th>Monto</th></tr>
      <tr><td>Vacación proporcional</td><td>15 días + 30% recargo</td><td class="n">${fmt(d.vacacion)}</td></tr>
      <tr><td>Aguinaldo proporcional</td><td>Según antigüedad</td><td class="n">${fmt(d.aguinaldo)}</td></tr>
      <tr><td>${d.indemLabel}</td><td>${d.indemNota}</td><td class="n">${fmt(d.indem)}</td></tr>
      <tr><td>Horas extra diurnas</td><td>Recargo 100%</td><td class="n">${fmt(d.pagoHED)}</td></tr>
      <tr><td>Horas extra nocturnas</td><td>Nocturnidad + 100%</td><td class="n">${fmt(d.pagoHEN)}</td></tr>
      <tr><td>Asueto / descanso trabajado</td><td>Recargo 100% / 50%</td><td class="n">${fmt(d.pagoAsueto+d.pagoDescanso)}</td></tr>
      <tr class="p-total"><td colspan="2">Total devengado (bruto)</td><td class="n">${fmt(d.totalDevengado)}</td></tr>
    </table>

    <table class="p-table"><tr><th>Deducción</th><th>Monto</th></tr>
      <tr><td>ISSS (3%)</td><td class="n">-${fmt(d.isssMonto)}</td></tr>
      <tr><td>AFP (7.25%)</td><td class="n">-${fmt(d.afpMonto)}</td></tr>
      <tr><td>ISR</td><td class="n">-${fmt(d.isrMonto)}</td></tr>
      <tr class="p-total"><td>Total deducciones</td><td class="n">-${fmt(d.totalDeducciones)}</td></tr>
      <tr class="p-total"><td>NETO A PAGAR</td><td class="n">${fmt(d.neto)}</td></tr>
    </table>
    <p><i>${montoALetras(Math.max(0,d.neto))}</i></p>
  </div>
  <div class="p-page">
    <div class="p-head"><h2>Declaración de conformidad</h2><div>${hoy}</div></div>
    <p>Yo, <b>${d.nombre}</b>, portador(a) de DUI número <b>${d.dui}</b>, declaro haber recibido de parte de <b>${d.patrono}</b> la cantidad de <b>${fmt(d.neto)}</b> (${montoALetras(Math.max(0,d.neto))}) en concepto de liquidación final de prestaciones laborales correspondientes a mi tiempo de servicio, manifestando mi entera conformidad con los montos y conceptos detallados en la página anterior, sin reserva de acción posterior alguna derivada de dicha relación laboral.</p>

    <div class="p-sign">
      <div>Firma del trabajador(a)<br>${d.nombre}</div>
      <div>Firma y sello del patrono<br>${d.patrono}</div>
    </div>

    <div class="p-legal">
      <b>Advertencia legal (Art. 402 Código de Trabajo):</b> el presente documento, para tener validez como comprobante de terminación y liquidación de la relación laboral, debe formalizarse mediante documento privado autenticado por notario o mediante la hoja de finiquito del Ministerio de Trabajo y Previsión Social, únicos instrumentos reconocidos por la ley para tal efecto. Este comprobante es una herramienta de cálculo de referencia y no reemplaza dicha formalización.
    </div>
  </div>`;
}

['nombre','dui','cargo','patrono','salario','sector','ingreso','fin','motivo','hed','hen','asueto','descanso']
  .forEach(id => $(id).addEventListener('input', () => buildPrintSheet(calcular())));

$('printBtn').addEventListener('click', ()=>{ buildPrintSheet(calcular()); window.print(); });

buildPrintSheet(calcular());
