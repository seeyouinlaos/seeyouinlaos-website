/* See You In Laos — shared localization layer (HSW-001-ED-FER-001 §7).
 * ONE canonical EN DOM + string-keyed dictionaries for DE/TH/JA.
 * - English is the frozen source copy and the automatic fallback.
 * - Translation is presentation-only: it never touches guest state, session,
 *   selections, acknowledgements, contribution or registration status.
 * - Originals are remembered per text node so switching languages restores
 *   EN first and re-applies — no compounding, no state resets.
 * - No runtime machine translation: every string below is authored. */
(function () {
  'use strict';
  var LANGS = ['en', 'de', 'th', 'ja'];
  var KEY = 'siyl.lang';
  var lang = 'en';
  try { var st = localStorage.getItem(KEY); if (LANGS.indexOf(st) > -1) lang = st; } catch (e) {}

  /* DICT: exact-match on trimmed text-node content. [de, th, ja]; EN is the key. */
  var D = {};
  function E(en, de, th, ja) { D[en] = [de, th, ja]; }

  /* ---- statuses / shared tokens (also used by pattern rules) ---- */
  E("REQUESTED", "ANGEFRAGT", "ส่งคำขอแล้ว", "リクエスト済み");
  E("UNDER REVIEW", "WIRD GERADE GEPRÜFT", "กำลังตรวจสอบ", "確認中");
  E("CONFIRMED", "BESTÄTIGT", "ยืนยันแล้ว", "確定");
  E("WAITLISTED", "WARTELISTE", "อยู่ในรายชื่อรอ", "キャンセル待ち");
  E("Experiences", "Erlebnisse", "ประสบการณ์", "体験");
  E("Your journey · choose the parts you are joining", "Eure Reise · wählt die Teile, die ihr mitgeht", "เส้นทางของคุณ · เลือกช่วงที่คุณจะร่วมเดินทาง", "あなたの旅——ご一緒いただく行程をお選びください");
  E("Choosing a destination sets nothing in stone and costs nothing — it only opens the right choices for you.", "Eine Auswahl legt nichts fest und kostet nichts — sie öffnet nur die passenden Möglichkeiten für euch.", "การเลือกจุดหมายยังไม่ผูกมัดและไม่มีค่าใช้จ่ายใด เพียงเปิดตัวเลือกที่เหมาะกับคุณ", "行き先を選んでも何も確定せず、費用も一切かかりません——あなたに合う選択肢が開くだけです。");
  E("The heart of the journey", "Das Herz der Reise", "หัวใจของเส้นทาง", "旅の中心");
  E("Optional part of the journey", "Optionaler Teil der Reise", "ช่วงทางเลือกของเส้นทาง", "任意の行程");
  E("Always part of your journey", "Immer Teil eurer Reise", "เป็นส่วนหนึ่งของเส้นทางเสมอ", "常に旅の一部です");
  E("Part of our journey", "Teil unserer Reise", "ร่วมเดินทางช่วงนี้", "この行程に参加");
  E("Laos · The Wedding", "Laos · Die Hochzeit", "ลาว · งานแต่งงาน", "ラオス・結婚式");
  E("China · Onward Journey", "China · Weiterreise", "จีน · เส้นทางต่อ", "中国・その先の旅");
  E("Vientiane, the wedding days and everything around them.", "Vientiane, die Hochzeitstage und alles darum herum.", "เวียงจันทน์ วันแห่งงานแต่ง และทุกสิ่งรอบตัว", "ビエンチャン、結婚式の日々、そのすべて。");
  E("Kunming and Lijiang after the wedding — join a part of the onward journey.", "Kunming und Lijiang nach der Hochzeit — geht einen Teil der Weiterreise mit.", "คุนหมิงและลี่เจียงหลังงานแต่ง ร่วมเส้นทางต่อได้บางช่วง", "挙式後の昆明と麗江——その先の旅の一部にご一緒に。");
  E("How would you like to be part of the wedding day?", "Wie möchtet ihr am Hochzeitstag dabei sein?", "คุณอยากร่วมวันแต่งงานแบบไหน", "結婚式の一日に、どのように参加なさいますか？");
  E("The full wedding day", "Der ganze Hochzeitstag", "ร่วมทั้งวันงาน", "結婚式の一日すべて");
  E("Alms Giving, Vow Ceremony and Wedding Dinner.", "Morgenritual, Eheversprechen und Hochzeitsdinner.", "ตักบาตร พิธีกล่าวคำสัญญา และงานเลี้ยงมงคลสมรส", "托鉢の儀、誓いのセレモニー、ウェディングディナー。");
  E("Wedding Dinner only", "Nur das Hochzeitsdinner", "ร่วมเฉพาะงานเลี้ยงมงคลสมรส", "ウェディングディナーのみ");
  E("Join us in the evening at Souphattra Vientiane Hotel.", "Seid am Abend im Souphattra Vientiane Hotel dabei.", "มาร่วมค่ำคืนนี้ที่โรงแรมสุพัตรา เวียงจันทน์", "夜、スパッタラ・ビエンチャン・ホテルでご一緒に。");
  E("Choose individual moments", "Einzelne Momente wählen", "เลือกช่วงเวลาเอง", "参加する時間を選ぶ");
  E("Select the moments below, one by one.", "Wählt die Momente unten einzeln aus.", "เลือกช่วงเวลาด้านล่างทีละรายการ", "下の各モーメントを一つずつお選びください。");
  E("Your stay · how would you like to sleep?", "Euer Aufenthalt · wie möchtet ihr wohnen?", "ที่พักของคุณ · อยากพักแบบไหน", "ご滞在——どのようにお休みになりますか？");
  E("The wedding stay", "Der Hochzeitsaufenthalt", "การพักช่วงงานแต่ง", "ウェディングステイ");
  E("27 FEB – 01 MAR 2027 · 2 nights · the second night is hosted by Haruthai & Suthep.", "27. FEB – 01. MÄRZ 2027 · 2 Nächte · die zweite Nacht übernehmen Haruthai & Suthep für euch.", "27 ก.พ. – 01 มี.ค. 2027 · 2 คืน · คืนที่สองหฤทัยและสุเทพดูแลให้", "2027年2月27日–3月1日・2泊・2泊目はハルタイ＆ステープのおもてなしです。");
  E("One night around the Wedding Dinner", "Eine Nacht rund um das Hochzeitsdinner", "พักหนึ่งคืนสำหรับงานเลี้ยงมงคลสมรส", "ウェディングディナーにあわせて1泊");
  E("28 FEB – 01 MAR 2027 · 1 night · Price to be finalized with Guest Relations.", "28. FEB – 01. MÄRZ 2027 · 1 Nacht · Preis wird mit Guest Relations abgestimmt.", "28 ก.พ. – 01 มี.ค. 2027 · 1 คืน · ราคาสรุปกับฝ่ายดูแลแขก", "2027年2月28日–3月1日・1泊・料金はゲストリレーションズとご相談のうえ確定します。");
  E("Own accommodation", "Eigene Unterkunft", "ที่พักของคุณเอง", "ご自身の宿泊先");
  E("You stay on your own arrangement — nothing is needed from us, and nothing is charged.", "Ihr wohnt in eigener Organisation — von uns ist nichts nötig, und nichts wird berechnet.", "คุณพักตามการจัดการของคุณเอง ไม่ต้องมีอะไรจากเรา และไม่มีค่าใช้จ่ายใด", "ご自身の手配でご滞在——こちらからの手配も費用も一切ありません。");
  E("Room category for your night", "Zimmerkategorie für eure Nacht", "ประเภทห้องสำหรับคืนของคุณ", "ご宿泊のお部屋カテゴリー");
  E("Please choose", "Bitte wählen", "โปรดเลือก", "お選びください");
  E("Price to be finalized with Guest Relations — nothing is added to your costs until Khun Ket or Khun Paddy confirms it personally with you.", "Der Preis wird mit Guest Relations abgestimmt — zu euren Kosten kommt nichts hinzu, bevor Khun Ket oder Khun Paddy es persönlich mit euch bestätigt hat.", "ราคาสรุปกับฝ่ายดูแลแขก จะไม่มีการเพิ่มในค่าใช้จ่ายของคุณจนกว่าคุณเกตุหรือคุณแพดดี้จะยืนยันกับคุณเป็นการส่วนตัว", "料金はゲストリレーションズとご相談のうえ確定します——クン・ケットまたはクン・パディが直接ご確認するまで、費用には何も加算されません。");
  E("Own accommodation · no arrangement needed. If plans change, this choice can be changed at any time.", "Eigene Unterkunft · keine Arrangements nötig. Wenn sich eure Pläne ändern, könnt ihr die Wahl jederzeit anpassen.", "ที่พักของคุณเอง · ไม่ต้องจัดเตรียมใด หากแผนเปลี่ยน ปรับตัวเลือกนี้ได้ตลอดเวลา", "ご自身の宿泊先・手配は不要です。ご予定が変わっても、いつでも変更できます。");
  E("Own accommodation · no arrangement needed", "Eigene Unterkunft · keine Arrangements nötig", "ที่พักของคุณเอง · ไม่ต้องจัดเตรียมใด", "ご自身の宿泊先・手配不要");
  E("Price to be finalized with Guest Relations", "Preis wird mit Guest Relations abgestimmt", "ราคาสรุปกับฝ่ายดูแลแขก", "料金はゲストリレーションズとご相談のうえ確定");
  E("No paid optional arrangements selected through Guest Relations.", "Keine kostenpflichtigen zusätzlichen Arrangements ausgewählt.", "ยังไม่ได้เลือกบริการเสริมที่มีค่าใช้จ่ายผ่านฝ่ายดูแลแขก", "ゲストリレーションズを通じた有料の追加手配は選択されていません。");
  E("28 FEB – 01 MAR 2027", "28. FEB – 01. MÄRZ 2027", "28 ก.พ. – 01 มี.ค. 2027", "2027年2月28日–3月1日");
  E("1 night", "1 Nacht", "1 คืน", "1泊");
  E("One-night wedding stay", "Hochzeitsaufenthalt · eine Nacht", "พักหนึ่งคืนช่วงงานแต่ง", "ウェディングステイ・1泊");
  E("A few places we love, around the parts of the journey you are joining. A recommendation is not a booking — nothing is arranged and nothing is charged until you ask us and Guest Relations confirms it with you.", "Ein paar Orte, die wir lieben — rund um die Teile der Reise, die ihr mitgeht. Eine Empfehlung ist keine Buchung: Nichts wird arrangiert und nichts berechnet, bevor ihr uns fragt und Guest Relations es mit euch bestätigt.", "สถานที่ที่เรารัก รอบช่วงเส้นทางที่คุณร่วมเดินทาง คำแนะนำไม่ใช่การจอง จะไม่มีการจัดเตรียมหรือค่าใช้จ่ายจนกว่าคุณจะแจ้งเราและฝ่ายดูแลแขกยืนยันกับคุณ", "旅のご一緒いただく行程にあわせた、私たちの好きな場所です。おすすめは予約ではありません——お声がけいただき、ゲストリレーションズがご確認するまで、手配も費用も発生しません。");
  E("Dining", "Essen & Trinken", "ร้านอาหาร", "ダイニング");
  E("Things to do", "Entdecken", "สิ่งที่น่าทำ", "見どころ");
  E("Wellness", "Wellness", "เวลเนส", "ウェルネス");
  E("Wellness at the hotel", "Wellness im Hotel", "เวลเนสที่โรงแรม", "ホテルでのウェルネス");
  E("Ask Guest Relations", "Guest Relations fragen", "สอบถามฝ่ายดูแลแขก", "ゲストリレーションズに相談");
  E("Withdraw request", "Anfrage zurückziehen", "ถอนคำขอ", "リクエストを取り下げる");
  E("Experiences requested", "Angefragte Erlebnisse", "ประสบการณ์ที่ส่งคำขอ", "リクエスト済みの体験");
  E("Your costs", "Eure Kosten", "ค่าใช้จ่ายของคุณ", "ご負担の費用");
  E("Pha That Luang", "Pha That Luang", "พระธาตุหลวง", "タート・ルアン");
  E("Vientiane Night Market", "Vientiane Night Market", "ตลาดกลางคืนเวียงจันทน์", "ビエンチャン・ナイトマーケット");
  E("Le Padaek", "Le Padaek", "Le Padaek", "ル・パデーク");
  E("3 Merchants Restaurant", "3 Merchants Restaurant", "3 Merchants Restaurant", "3マーチャンツ・レストラン");
  E("Sona Cafe and Bar", "Sona Cafe and Bar", "Sona Cafe and Bar", "ソナ・カフェ＆バー");
  E("Thong Smith", "Thong Smith", "Thong Smith", "トン・スミス");
  E("Cafe Madeleine", "Cafe Madeleine", "Cafe Madeleine", "カフェ・マドレーヌ");
  E("Let's Relax", "Let's Relax", "Let's Relax", "レッツリラックス");
  E("ICONSIAM", "ICONSIAM", "ไอคอนสยาม", "アイコンサイアム");
  E("Temple Ceremony", "Tempelzeremonie", "พิธีที่วัด", "寺院での儀式");
  E("The Temple Ceremony", "Die Tempelzeremonie", "พิธีที่วัด", "寺院での儀式");
  E("Coffee & Cake", "Kaffee & Kuchen", "กาแฟและเค้ก", "コーヒー＆ケーキ");
  E("09:00 AM", "09:00 Uhr", "09:00 น.", "9:00");
  E("09:00 AM – approx. 12:00 PM", "09:00 – ca. 12:00 Uhr", "09:00 – ประมาณ 12:00 น.", "9:00〜正午ごろ");
  E("After the return", "Nach der Rückkehr", "หลังเดินทางกลับ", "帰着後");
  E("After the return from the temple", "Nach der Rückkehr vom Tempel", "หลังกลับจากวัด", "寺院から戻ったあと");
  E("In the morning", "Am Morgen", "ยามเช้า", "朝");
  E("Open in Google Maps", "In Google Maps öffnen", "เปิดใน Google Maps", "Google Mapsで開く");
  E("Wat Ong Teu Temple, Vientiane", "Wat Ong Teu Tempel, Vientiane", "วัดองค์ตื้อ เวียงจันทน์", "ワット・オンテウ寺院（ビエンチャン）");
  E("· Wat Ong Teu Temple, Vientiane", "· Wat Ong Teu Tempel, Vientiane", "· วัดองค์ตื้อ เวียงจันทน์", "・ワット・オンテウ寺院（ビエンチャン）");
  E("Sunday, 28 Feb · 09:00 AM", "Sonntag, 28. Feb · 09:00 Uhr", "อาทิตย์ 28 ก.พ. · 09:00 น.", "2月28日（日）9:00");
  E("Sunday, 28 February 2027 · in the morning", "Sonntag, 28. Februar 2027 · am Morgen", "อาทิตย์ 28 กุมภาพันธ์ 2027 · ยามเช้า", "2027年2月28日（日）朝");
  E("The wedding day begins at the temple: a Buddhist morning ceremony, unhurried and full of meaning. By midday we return together for coffee & cake.",
    "Der Hochzeitstag beginnt im Tempel: eine buddhistische Morgenzeremonie, ohne Eile und voller Bedeutung. Gegen Mittag kehren wir gemeinsam zurück zu Kaffee & Kuchen.",
    "วันแต่งงานเริ่มต้นที่วัด พิธีเช้าแบบพุทธ อย่างไม่เร่งรีบและเปี่ยมความหมาย ราวเที่ยงเรากลับมาพร้อมกันเพื่อกาแฟและเค้ก",
    "結婚式の一日は寺院から始まります。急がず、意味に満ちた朝の仏教儀式。正午ごろ、みなで戻ってコーヒー＆ケーキを。");
  E("The wedding day begins at Wat Ong Teu Temple: a Buddhist morning ceremony from nine, unhurried and full of meaning.",
    "Der Hochzeitstag beginnt im Wat Ong Teu Tempel: eine buddhistische Morgenzeremonie ab neun Uhr, ohne Eile und voller Bedeutung.",
    "วันแต่งงานเริ่มต้นที่วัดองค์ตื้อ พิธีเช้าแบบพุทธตั้งแต่เก้าโมง อย่างไม่เร่งรีบและเปี่ยมความหมาย",
    "結婚式の一日はワット・オンテウ寺院から。9時からの朝の仏教儀式は、急がず、意味に満ちています。");
  E("The wedding day begins at Wat Ong Teu Temple in Vientiane: a Buddhist morning ceremony from nine until around midday, unhurried and full of meaning. Afterwards we return together to the hotel for coffee & cake before the vows.",
    "Der Hochzeitstag beginnt im Wat Ong Teu Tempel in Vientiane: eine buddhistische Morgenzeremonie von neun bis etwa zwölf Uhr, ohne Eile und voller Bedeutung. Danach kehren wir gemeinsam ins Hotel zurück — zu Kaffee & Kuchen vor dem Eheversprechen.",
    "วันแต่งงานเริ่มต้นที่วัดองค์ตื้อ เวียงจันทน์ พิธีเช้าแบบพุทธตั้งแต่เก้าโมงถึงราวเที่ยง อย่างไม่เร่งรีบและเปี่ยมความหมาย จากนั้นเรากลับโรงแรมพร้อมกัน เพื่อกาแฟและเค้กก่อนพิธีกล่าวคำสัญญา",
    "結婚式の一日は、ビエンチャンのワット・オンテウ寺院から始まります。9時から正午ごろまでの朝の仏教儀式——急がず、意味に満ちた時間です。その後みなでホテルへ戻り、誓いの前にコーヒー＆ケーキを。");
  E("A relaxed hour together after the temple — coffee, cake and time to breathe before the vows.",
    "Eine entspannte Stunde nach dem Tempel — Kaffee, Kuchen und Zeit zum Durchatmen vor dem Eheversprechen.",
    "ช่วงเวลาสบาย ๆ หลังจากวัด กาแฟ เค้ก และเวลาหายใจก่อนพิธีกล่าวคำสัญญา",
    "寺院のあとのくつろぎのひととき——コーヒーとケーキ、誓いの前に息をつく時間。");
  E("back from the temple — coffee, cake and time to breathe before the vows",
    "zurück vom Tempel — Kaffee, Kuchen und Zeit zum Durchatmen vor dem Eheversprechen",
    "กลับจากวัด กาแฟ เค้ก และเวลาหายใจก่อนพิธีกล่าวคำสัญญา",
    "寺院から戻って——コーヒーとケーキ、誓いの前のひととき");
  E("Temple Ceremony, Coffee & Cake, Vow Ceremony and Wedding Dinner.",
    "Tempelzeremonie, Kaffee & Kuchen, Eheversprechen und Hochzeitsdinner.",
    "พิธีที่วัด กาแฟและเค้ก พิธีกล่าวคำสัญญา และงานเลี้ยงมงคลสมรส",
    "寺院での儀式、コーヒー＆ケーキ、誓いのセレモニー、ウェディングディナー。");
  E("Temple mornings, the river at dusk, and the warmth of Lao hospitality.",
    "Tempelmorgen, der Fluss in der Dämmerung und die Wärme laotischer Gastfreundschaft.",
    "เช้าที่วัด แม่น้ำยามพลบค่ำ และไมตรีอันอบอุ่นแบบลาว",
    "寺院の朝、夕暮れの川、そしてラオスの温かなもてなし。");
  E("Wat Ong Teu Temple, Vientiane · Dress · Lao Traditional Dress",
    "Wat Ong Teu Tempel, Vientiane · Dress · Lao Traditional Dress",
    "วัดองค์ตื้อ เวียงจันทน์ · การแต่งกาย · ชุดประจำชาติลาว",
    "ワット・オンテウ寺院（ビエンチャン）・ドレスコード・ラオスの伝統衣装");
  E("Temple Ceremony · in the morning", "Tempelzeremonie · am Morgen", "พิธีที่วัด · ยามเช้า", "寺院での儀式・朝");
  E("The temple ceremony, in Vientiane", "Die Tempelzeremonie in Vientiane", "พิธีที่วัด เวียงจันทน์", "ビエンチャンでの寺院の儀式");
  E("· Your exact timing arrives in your Guest Area closer to the day.",
    "· Euer genauer Zeitplan erreicht euch näher am Tag in eurem Gästebereich.",
    "· กำหนดเวลาที่แน่นอนจะถึงคุณในส่วนสำหรับแขกเมื่อใกล้วันงาน",
    "・正確なお時間は、当日が近づきましたらゲストエリアにお届けします。");
  E("· a Buddhist morning ceremony until around midday ·",
    "· eine buddhistische Morgenzeremonie bis etwa zwölf Uhr ·",
    "· พิธีเช้าแบบพุทธจนถึงราวเที่ยง ·",
    "・正午ごろまでの朝の仏教儀式・");
  E("My Plan", "Mein Reiseplan", "แผนการเดินทางของฉัน", "旅のプラン");
  E("Your wedding stay · one or two nights?", "Euer Hochzeitsaufenthalt · eine oder zwei Nächte?", "การพักช่วงงานแต่ง · หนึ่งหรือสองคืน?", "ウェディングステイ——1泊または2泊？");
  E("Two nights", "Zwei Nächte", "สองคืน", "2泊");
  E("One night", "Eine Nacht", "หนึ่งคืน", "1泊");
  E("27 FEB – 01 MAR 2027 · 2 nights · the second night is hosted by Haruthai & Suthep. Breakfast is included on both mornings.",
    "27. FEB – 01. MÄRZ 2027 · 2 Nächte · die zweite Nacht übernehmen Haruthai & Suthep für euch. Frühstück ist an beiden Morgen inklusive.",
    "27 ก.พ. – 01 มี.ค. 2027 · 2 คืน · คืนที่สองหฤทัยและสุเทพดูแลให้ อาหารเช้ารวมทั้งสองวัน",
    "2027年2月27日–3月1日・2泊・2泊目はハルタイ＆ステープのおもてなし。朝食は両朝付きです。");
  E("28 FEB – 01 MAR 2027 · 1 night · breakfast is included.",
    "28. FEB – 01. MÄRZ 2027 · 1 Nacht · Frühstück inklusive.",
    "28 ก.พ. – 01 มี.ค. 2027 · 1 คืน · รวมอาหารเช้า",
    "2027年2月28日–3月1日・1泊・朝食付き。");
  E("Both choices offer the same room categories below.", "Beide Optionen bieten dieselben Zimmerkategorien unten.", "ทั้งสองแบบเลือกได้จากประเภทห้องเดียวกันด้านล่าง", "どちらを選んでも、下記の同じお部屋カテゴリーからお選びいただけます。");
  E("Your one-night wedding stay: 28 FEB – 01 MAR 2027, breakfast included. The amount shown is the approved amount for your room category.",
    "Euer Hochzeitsaufenthalt mit einer Nacht: 28. FEB – 01. MÄRZ 2027, Frühstück inklusive. Der angezeigte Betrag ist der freigegebene Betrag eurer Zimmerkategorie.",
    "การพักหนึ่งคืนของคุณ 28 ก.พ. – 01 มี.ค. 2027 รวมอาหารเช้า จำนวนที่แสดงคือยอดที่กำหนดไว้สำหรับประเภทห้องของคุณ",
    "1泊のウェディングステイ：2027年2月28日–3月1日、朝食付き。表示額はお部屋カテゴリーの承認済み金額です。");
  E("Payment preference", "Zahlungswunsch", "รูปแบบการชำระ", "お支払い方法のご希望");
  E("How would you like to settle your costs?", "Wie möchtet ihr eure Kosten begleichen?", "คุณต้องการชำระค่าใช้จ่ายแบบใด", "費用のお支払いは、どのようになさいますか？");
  E("Pay in full", "In einer Zahlung", "ชำระเต็มจำนวน", "一括で支払う");
  E("One payment once your arrangements are confirmed.", "Eine Zahlung, sobald eure Arrangements bestätigt sind.", "ชำระครั้งเดียวเมื่อการเตรียมการได้รับการยืนยัน", "手配確定後に、一度でお支払いいただきます。");
  E("Pay in installments", "In Teilzahlungen bezahlen", "แบ่งชำระเป็นงวด", "分割で支払う");
  E("Khun Ket and Khun Paddy will coordinate the payment schedule with you personally.",
    "Khun Ket und Khun Paddy stimmen den Zahlungsplan persönlich mit euch ab.",
    "คุณเกตุและคุณแพดดี้จะประสานแผนการชำระกับคุณเป็นการส่วนตัว",
    "お支払いのスケジュールは、クン・ケットとクン・パディが直接ご相談のうえ決めさせていただきます。");
  E("Review my plan & submit", "Meinen Reiseplan prüfen & senden", "ตรวจแผนการเดินทางและส่ง", "旅のプランを確認して送信");
  E("View experience", "Erlebnis ansehen", "ดูประสบการณ์", "体験を見る");
  E("Ask Khun Ket & Khun Paddy to arrange this", "Khun Ket & Khun Paddy bitten, das zu arrangieren", "ให้คุณเกตุและคุณแพดดี้จัดให้", "クン・ケット＆クン・パディに手配を頼む");
  E("Kaogee Le Triomphe", "Kaogee Le Triomphe", "เกาจี เลอ ทริออมฟ์", "カオジー・ル・トリオンフ");
  E("Oath House", "Oath House", "โอธเฮาส์", "オースハウス");
  E("1–2 hours · relaxed", "1–2 Stunden · entspannt", "1–2 ชั่วโมง · สบาย ๆ", "1〜2時間・リラックス");
  E("2 hours · smart casual", "2 Stunden · Smart Casual", "2 ชั่วโมง · สมาร์ทแคชชวล", "2時間・スマートカジュアル");
  E("1 hour · relaxed", "1 Stunde · entspannt", "1 ชั่วโมง · สบาย ๆ", "1時間・リラックス");
  E("evening · smart casual", "abends · Smart Casual", "ยามค่ำ · สมาร์ทแคชชวล", "夜・スマートカジュアル");
  E("1–2 hours", "1–2 Stunden", "1–2 ชั่วโมง", "1〜2時間");
  E("2+ hours · relaxed", "2+ Stunden · entspannt", "2 ชั่วโมงขึ้นไป · สบาย ๆ", "2時間以上・リラックス");
  E("A refined Vientiane dining room we love — calm, contemporary and generous.", "Ein feiner Vientiane-Speisesaal, den wir lieben — ruhig, zeitgemäß und großzügig.", "ห้องอาหารเวียงจันทน์ที่เรารัก สงบ ร่วมสมัย และใจกว้าง", "私たちの愛するビエンチャンのダイニング——静かで現代的、そして寛やか。");
  E("Coffee by day, easy drinks by evening — a favourite pause in the city.", "Tagsüber Kaffee, abends unkomplizierte Drinks — eine Lieblingspause in der Stadt.", "กาแฟยามกลางวัน เครื่องดื่มสบาย ๆ ยามเย็น จุดพักโปรดกลางเมือง", "昼はコーヒー、夕べは気軽な一杯——街のお気に入りのひと休み。");
  E("The classic Vientiane café moment — kaogee baguettes and good coffee near the Patuxay.", "Der klassische Vientiane-Café-Moment — Kaogee-Baguettes und guter Kaffee nahe dem Patuxay.", "โมเมนต์คาเฟ่คลาสสิกของเวียงจันทน์ ขนมปังเข้าจี่กับกาแฟดี ๆ ใกล้ประตูชัย", "ビエンチャンの定番カフェ時間——パトゥーサイ近くでカオジーとおいしいコーヒーを。");
  E("An intimate evening bar — considered drinks in a beautiful room.", "Eine intime Abendbar — durchdachte Drinks in einem schönen Raum.", "บาร์ยามค่ำอันเป็นส่วนตัว เครื่องดื่มพิถีพิถันในห้องงดงาม", "親密な夜のバー——美しい空間で丁寧な一杯を。");
  E("One night · your costs · breakfast included", "Eine Nacht · eure Kosten · Frühstück inklusive", "หนึ่งคืน · ค่าใช้จ่ายของคุณ · รวมอาหารเช้า", "1泊・ご負担の費用・朝食付き");
  E("Your stay in Bangkok", "Eure Unterkunft in Bangkok", "ที่พักของคุณในกรุงเทพฯ", "バンコクでのご滞在");
  E("Stay with us", "Bei uns wohnen", "พักกับเรา", "私たちと同じ滞在に");
  E("Choose the arranged Bangkok stay — dates and your costs follow immediately.", "Wählt den arrangierten Bangkok-Aufenthalt — Daten und eure Kosten folgen sofort.", "เลือกที่พักกรุงเทพฯ ที่จัดเตรียมไว้ วันที่และค่าใช้จ่ายของคุณตามมาทันที", "手配済みのバンコク滞在を選ぶと、日程と費用がすぐに反映されます。");
  E("Arrange my own stay", "Eigene Unterkunft organisieren", "จัดที่พักเอง", "自分で滞在を手配する");
  E("Bangkok stays part of your journey — no hotel costs through us.", "Bangkok bleibt Teil eurer Reise — keine Hotelkosten über uns.", "กรุงเทพฯ ยังเป็นส่วนหนึ่งของเส้นทาง โดยไม่มีค่าโรงแรมผ่านเรา", "バンコクは旅の一部のまま——こちらを通じた宿泊費はかかりません。");
  E("Own arrangement noted — nothing is charged for a Bangkok stay.", "Eigene Organisation notiert — für eine Bangkok-Unterkunft wird nichts berechnet.", "บันทึกการจัดการเองแล้ว ไม่มีค่าใช้จ่ายที่พักกรุงเทพฯ", "ご自身での手配として承りました——バンコク滞在の費用はかかりません。");
  E("Please choose so your total costs are complete.", "Bitte wählt, damit eure Gesamtkosten vollständig sind.", "โปรดเลือกเพื่อให้ค่าใช้จ่ายรวมของคุณครบถ้วน", "合計費用が確定するよう、お選びください。");
  E("Check-in", "Check-in", "เช็คอิน", "チェックイン");
  E("Check-out", "Check-out", "เช็คเอาท์", "チェックアウト");
  E("Your Bangkok stay · choose Stay with us or your own arrangement under My Journey", "Eure Bangkok-Unterkunft · unter Meine Reise „Bei uns wohnen“ oder eigene Organisation wählen", "ที่พักกรุงเทพฯ ของคุณ · เลือก พักกับเรา หรือจัดเอง ได้ที่ เส้นทางของฉัน", "バンコクのご滞在——「旅のしおり」で「私たちと同じ滞在に」またはご自身での手配をお選びください");
  E("Thailand · Bangkok", "Thailand · Bangkok", "ไทย · กรุงเทพฯ", "タイ・バンコク");
  E("Travellers", "Reisende", "จำนวนผู้เดินทาง", "ご旅行人数");
  E("Bangkok Stay · Bangkok, Thailand", "Bangkok Stay · Bangkok, Thailand", "ที่พักกรุงเทพฯ · กรุงเทพฯ ประเทศไทย", "バンコク・ステイ（タイ・バンコク）");
  E("Your arrival details for Guest Relations (flight/train, booked by you)", "Eure Ankunftsdaten für Guest Relations (Flug/Zug, von euch gebucht)", "รายละเอียดการเดินทางถึงสำหรับฝ่ายดูแลแขก (เที่ยวบิน/รถไฟที่คุณจองเอง)", "ゲストリレーションズ用のご到着情報（ご自身で手配の便・列車）");
  E("1 adult", "1 Erwachsene(r)", "ผู้ใหญ่ 1 คน", "大人1名");
  E("2 adults", "2 Erwachsene", "ผู้ใหญ่ 2 คน", "大人2名");
  E("China Journey", "China-Reise", "เส้นทางประเทศจีน", "中国の旅");
  E("China · Kunming", "China · Kunming", "จีน · คุนหมิง", "中国・昆明");
  E("China · Lijiang", "China · Lijiang", "จีน · ลี่เจียง", "中国・麗江");
  E("Your stay in Kunming", "Eure Unterkunft in Kunming", "ที่พักของคุณในคุนหมิง", "昆明でのご滞在");
  E("Your stay in Lijiang", "Eure Unterkunft in Lijiang", "ที่พักของคุณในลี่เจียง", "麗江でのご滞在");
  E("Vientiane → Kunming · Flight", "Vientiane → Kunming · Flug", "เวียงจันทน์ → คุนหมิง · เที่ยวบิน", "ビエンチャン→昆明・フライト");
  E("China Eastern · arranged with Guest Relations", "China Eastern · mit Guest Relations arrangiert", "ไชน่าอีสเทิร์น · จัดเตรียมกับฝ่ายดูแลแขก", "中国東方航空・ゲストリレーションズが手配");
  E("Kunming → Lijiang · First Class Train", "Kunming → Lijiang · First-Class-Zug", "คุนหมิง → ลี่เจียง · รถไฟชั้นหนึ่ง", "昆明→麗江・一等列車");
  E("Lijiang → Bangkok / onward", "Lijiang → Bangkok / Weiterreise", "ลี่เจียง → กรุงเทพฯ / เดินทางต่อ", "麗江→バンコク／その先へ");
  E("Your choice — return with us, continue elsewhere or your own plans", "Eure Wahl — mit uns zurück, anderswo weiter oder eigene Pläne", "เลือกได้ตามใจ กลับกับเรา เดินทางต่อที่อื่น หรือแผนของคุณเอง", "お好きに——一緒に戻る、別の地へ、ご自身の計画も");
  E("Choose the arranged stay — the confirmed rate and your costs follow immediately.", "Den arrangierten Aufenthalt wählen — der bestätigte Preis und eure Kosten folgen sofort.", "เลือกที่พักที่จัดเตรียมไว้ ราคายืนยันและค่าใช้จ่ายของคุณแสดงทันที", "手配済みの滞在を選ぶと、確定料金とご費用がすぐに表示されます。");
  E("This destination stays part of your journey — no accommodation through us, USD 0.", "Das Ziel bleibt Teil eurer Reise — keine Unterkunft über uns, USD 0.", "จุดหมายนี้ยังเป็นส่วนหนึ่งของเส้นทาง โดยไม่มีที่พักผ่านเรา USD 0", "この目的地は旅の一部のまま——こちらを通じた宿泊はなし、USD 0です。");
  E("6 rooms available · limited availability", "6 Zimmer verfügbar · begrenzte Verfügbarkeit", "มีห้องว่าง 6 ห้อง · จำนวนจำกัด", "残り6室・数に限りがあります");
  E("Laos · Vientiane", "Laos · Vientiane", "ลาว · เวียงจันทน์", "ラオス・ビエンチャン");
  E("27 FEB – 01 MAR 2027 · The Wedding · departure 01 MAR 2027 fixed", "27. FEB – 01. MÄR 2027 · Die Hochzeit · Abreise 01. MÄR 2027 fest", "27 ก.พ. – 1 มี.ค. 2027 · งานแต่งงาน · ออกเดินทาง 1 มี.ค. 2027 กำหนดตายตัว", "2027年2月27日–3月1日・結婚式・出発は3月1日で確定");
  E("Your wedding stay · Souphattra Heritage Vientiane", "Euer Hochzeitsaufenthalt · Souphattra Heritage Vientiane", "ที่พักช่วงงานแต่งงานของคุณ · สุพัตรา เฮอริเทจ เวียงจันทน์", "ウェディングステイ・スパッタラ・ヘリテージ・ビエンチャン");
  E("Two nights", "Zwei Nächte", "สองคืน", "2泊");
  E("One night", "Eine Nacht", "หนึ่งคืน", "1泊");
  E("27 FEB → 01 MAR 2027 · first night your costs, second night hosted by us · breakfast both mornings.", "27. FEB → 01. MÄR 2027 · erste Nacht eure Kosten, zweite Nacht von uns übernommen · Frühstück an beiden Morgen.", "27 ก.พ. → 1 มี.ค. 2027 · คืนแรกเป็นค่าใช้จ่ายของคุณ คืนที่สองเราดูแลให้ · อาหารเช้าทั้งสองวัน", "2027年2月27日→3月1日・1泊目はご負担、2泊目は私たちがご招待・朝食は両日付き。");
  E("28 FEB → 01 MAR 2027 · same approved category amount · breakfast included.", "28. FEB → 01. MÄR 2027 · gleicher freigegebener Kategoriebetrag · Frühstück inklusive.", "28 ก.พ. → 1 มี.ค. 2027 · ราคาเท่ากับหมวดห้องที่อนุมัติ · รวมอาหารเช้า", "2027年2月28日→3月1日・承認済みカテゴリーと同額・朝食付き。");
  E("Choose your room to complete this stay.", "Wählt euer Zimmer, um diesen Aufenthalt zu vervollständigen.", "เลือกห้องพักเพื่อทำให้ที่พักนี้สมบูรณ์", "お部屋を選んで滞在を完成させてください。");
  E("Choose your room", "Euer Zimmer wählen", "เลือกห้องพัก", "お部屋を選ぶ");
  E("Change your room", "Zimmer ändern", "เปลี่ยนห้องพัก", "お部屋を変更");
  E("Check-in · earlier arrival welcome", "Check-in · frühere Anreise willkommen", "เช็คอิน · มาถึงก่อนได้", "チェックイン・早めのご到着歓迎");
  E("Check-out · fixed", "Check-out · fest", "เช็คเอาท์ · กำหนดตายตัว", "チェックアウト・確定");
  E("Check-out 25 FEB 2027 is fixed — the day we all travel on to Vientiane together. Nights are calculated automatically.", "Der Check-out am 25. FEB 2027 ist fest — der Tag, an dem wir alle gemeinsam nach Vientiane weiterreisen. Die Nächte werden automatisch berechnet.", "เช็คเอาท์ 25 ก.พ. 2027 กำหนดตายตัว — วันที่เราทุกคนเดินทางต่อไปเวียงจันทน์ด้วยกัน จำนวนคืนคำนวณให้อัตโนมัติ", "チェックアウトは2027年2月25日で確定——全員でビエンチャンへ向かう日です。宿泊数は自動計算されます。");
  E("Own arrangement noted — nothing is charged for this stay.", "Eigene Organisation vermerkt — für diesen Aufenthalt wird nichts berechnet.", "บันทึกว่าจัดการเอง — ไม่มีค่าใช้จ่ายสำหรับที่พักนี้", "ご自身での手配として承りました——この滞在に費用はかかりません。");
  E("Complimentary · limited", "Kostenfrei · begrenzt", "ไม่มีค่าใช้จ่าย · จำนวนจำกัด", "無料・数量限定");
  E("Kunming stay", "Aufenthalt Kunming", "ที่พักคุนหมิง", "昆明の滞在");
  E("Lijiang stay", "Aufenthalt Lijiang", "ที่พักลี่เจียง", "麗江の滞在");
  E("Saturday, 27 Feb · Arrival Day", "Samstag, 27. Feb · Ankunftstag", "เสาร์ 27 ก.พ. · วันเดินทางมาถึง", "2月27日（土）・到着日");
  E("Arrival & Welcome", "Ankunft & Willkommen", "การมาถึงและการต้อนรับ", "ご到着とウェルカム");
  E("Vientiane receives us: across the Mekong, into the city, and home to one quiet courtyard. Check-in at Souphattra Heritage Vientiane, then the first unhurried evening — everyone arriving, the weekend beginning.", "Vientiane empfängt uns: über den Mekong, in die Stadt und heim in einen stillen Innenhof. Check-in im Souphattra Heritage Vientiane, dann der erste entspannte Abend — alle kommen an, das Wochenende beginnt.", "เวียงจันทน์ต้อนรับเรา ข้ามแม่น้ำโขงเข้าสู่ตัวเมือง สู่ลานบ้านอันเงียบสงบ เช็คอินที่สุพัตรา เฮอริเทจ เวียงจันทน์ แล้วค่ำคืนแรกอันผ่อนคลาย ทุกคนทยอยมาถึง สุดสัปดาห์เริ่มต้นขึ้น", "ビエンチャンが私たちを迎えます。メコン川を渡り、街へ、静かな中庭のある我が家へ。スパッタラ・ヘリテージ・ビエンチャンにチェックインし、最初のゆったりした夜——みんなが到着し、週末が始まります。");
  E("Vientiane · Souphattra Heritage Vientiane", "Vientiane · Souphattra Heritage Vientiane", "เวียงจันทน์ · สุพัตรา เฮอริเทจ เวียงจันทน์", "ビエンチャン・スパッタラ・ヘリテージ・ビエンチャン");
  E("Sunday, 28 Feb · 09:00 AM · The Wedding Day", "Sonntag, 28. Feb · 09:00 Uhr · Der Hochzeitstag", "อาทิตย์ 28 ก.พ. · 09:00 น. · วันแต่งงาน", "2月28日（日）午前9時・結婚式当日");
  E("Bangkok · 21 – 25 FEB 2027 · Day 1 – 5", "Bangkok · 21. – 25. FEB 2027 · Tag 1 – 5", "กรุงเทพฯ · 21 – 25 ก.พ. 2027 · วันที่ 1 – 5", "バンコク・2027年2月21–25日・1〜5日目");
  E("Vientiane · 27 FEB – 01 MAR 2027 · Day 7 – 9 · the wedding days", "Vientiane · 27. FEB – 01. MÄR 2027 · Tag 7 – 9 · die Hochzeitstage", "เวียงจันทน์ · 27 ก.พ. – 1 มี.ค. 2027 · วันที่ 7 – 9 · วันงานแต่งงาน", "ビエンチャン・2027年2月27日–3月1日・7〜9日目・結婚式の日々");
  E("Our Journey", "Unsere Reise", "เส้นทางของเรา", "私たちの旅");
  E("Bangkok · Vientiane", "Bangkok · Vientiane", "กรุงเทพฯ · เวียงจันทน์", "バンコク・ビエンチャン");
  E("Kunming · Lijiang", "Kunming · Lijiang", "คุนหมิง · ลี่เจียง", "昆明・麗江");
  E("21 FEB – 06 MAR 2027 · Thailand → Laos → China", "21. FEB – 06. MÄR 2027 · Thailand → Laos → China", "21 ก.พ. – 6 มี.ค. 2027 · ไทย → ลาว → จีน", "2027年2月21日–3月6日・タイ→ラオス→中国");
  E("21 – 25 FEB 2027", "21. – 25. FEB 2027", "21 – 25 ก.พ. 2027", "2027年2月21–25日");
  E("27 FEB – 01 MAR 2027", "27. FEB – 01. MÄR 2027", "27 ก.พ. – 1 มี.ค. 2027", "2027年2月27日–3月1日");
  E("01 – 04 MAR 2027", "01. – 04. MÄR 2027", "1 – 4 มี.ค. 2027", "2027年3月1–4日");
  E("04 – 06 MAR 2027", "04. – 06. MÄR 2027", "4 – 6 มี.ค. 2027", "2027年3月4–6日");
  E("Bangkok", "Bangkok", "กรุงเทพฯ", "バンコク");
  E("Vientiane", "Vientiane", "เวียงจันทน์", "ビエンチャン");
  E("Kunming", "Kunming", "คุนหมิง", "昆明");
  E("Lijiang", "Lijiang", "ลี่เจียง", "麗江");
  E("The shared days before the wedding · optional", "Die gemeinsamen Tage vor der Hochzeit · optional", "วันเวลาร่วมกันก่อนงานแต่งงาน · เลือกได้", "結婚式前の共に過ごす日々・任意");
  E("The Wedding · the heart of the journey", "Die Hochzeit · das Herz der Reise", "งานแต่งงาน · หัวใจของเส้นทาง", "結婚式・旅の中心");
  E("Onward journey · optional", "Weiterreise · optional", "การเดินทางต่อ · เลือกได้", "その先の旅・任意");
  E("Journey map: Bangkok north to Vientiane for the wedding, onward by air to Kunming and by rail to Lijiang", "Reisekarte: von Bangkok nach Norden nach Vientiane zur Hochzeit, weiter per Flug nach Kunming und per Bahn nach Lijiang", "แผนที่เส้นทาง จากกรุงเทพฯ ขึ้นเหนือสู่เวียงจันทน์เพื่องานแต่งงาน ต่อเครื่องบินสู่คุนหมิงและรถไฟสู่ลี่เจียง", "旅の地図：バンコクから北へ、結婚式のビエンチャンへ。その先は空路で昆明、鉄道で麗江へ");
  E("Travel with us", "Mit uns reisen", "เดินทางกับเรา", "私たちと一緒に移動");
  E("Arrange my own travel", "Meine Anreise selbst organisieren", "จัดการเดินทางเอง", "移動は自分で手配");
  E("Join the arranged journey — details and any costs follow immediately.", "Der organisierten Reise anschließen — Details und etwaige Kosten folgen sofort.", "เข้าร่วมการเดินทางที่จัดเตรียมไว้ รายละเอียดและค่าใช้จ่ายแสดงทันที", "手配済みの旅程に参加——詳細と費用がすぐに表示されます。");
  E("You travel independently — USD 0 through Guest Relations.", "Ihr reist unabhängig — USD 0 über Guest Relations.", "คุณเดินทางเอง — USD 0 ผ่านฝ่ายดูแลแขก", "ご自身で移動——ゲストリレーションズ経由の費用はUSD 0。");
  E("Your journey to Laos", "Eure Reise nach Laos", "การเดินทางสู่ลาวของคุณ", "ラオスへの旅");
  E("Your journey to China", "Eure Reise nach China", "การเดินทางสู่จีนของคุณ", "中国への旅");
  E("Kunming → Lijiang", "Kunming → Lijiang", "คุนหมิง → ลี่เจียง", "昆明→麗江");
  E("Own arrangement noted — USD 0. Share your arrival details with Guest Relations.", "Eigene Organisation vermerkt — USD 0. Teilt eure Ankunftsdetails mit Guest Relations.", "บันทึกว่าจัดการเอง — USD 0 กรุณาแจ้งรายละเอียดการมาถึงกับฝ่ายดูแลแขก", "ご自身での手配として承りました——USD 0。到着の詳細をゲストリレーションズへお知らせください。");
  E("Own arrangement noted — USD 0. Fly or travel on your own schedule; we meet you in Vientiane.", "Eigene Organisation vermerkt — USD 0. Fliegt oder reist nach eurem eigenen Plan; wir sehen uns in Vientiane.", "บันทึกว่าจัดการเอง — USD 0 บินหรือเดินทางตามตารางของคุณ แล้วพบกันที่เวียงจันทน์", "ご自身での手配として承りました——USD 0。ご自身の予定で移動し、ビエンチャンでお会いしましょう。");
  E("Own arrangement noted — USD 0. Share your flight details with Guest Relations.", "Eigene Organisation vermerkt — USD 0. Teilt eure Flugdaten mit Guest Relations.", "บันทึกว่าจัดการเอง — USD 0 กรุณาแจ้งรายละเอียดเที่ยวบินกับฝ่ายดูแลแขก", "ご自身での手配として承りました——USD 0。フライト情報をゲストリレーションズへお知らせください。");
  E("Own arrangement noted — USD 0 for this leg.", "Eigene Organisation vermerkt — USD 0 für diese Etappe.", "บันทึกว่าจัดการเอง — USD 0 สำหรับช่วงนี้", "ご自身での手配として承りました——この区間はUSD 0。");
  E("Stay with us · Two nights", "Bei uns wohnen · Zwei Nächte", "พักกับเรา · สองคืน", "私たちと滞在・2泊");
  E("Stay with us · One night", "Bei uns wohnen · Eine Nacht", "พักกับเรา · หนึ่งคืน", "私たちと滞在・1泊");
  E("The wedding programme · 28 FEB 2027", "Das Hochzeitsprogramm · 28. FEB 2027", "กำหนดการงานแต่งงาน · 28 ก.พ. 2027", "結婚式プログラム・2027年2月28日");
  E("After the return", "Nach der Rückkehr", "หลังเดินทางกลับ", "戻ってから");
  E("BANGKOK", "BANGKOK", "กรุงเทพฯ", "バンコク");
  E("VIENTIANE", "VIENTIANE", "เวียงจันทน์", "ビエンチャン");
  E("KUNMING", "KUNMING", "คุนหมิง", "昆明");
  E("LIJIANG", "LIJIANG", "ลี่เจียง", "麗江");
  E("THAILAND", "THAILAND", "ไทย", "タイ");
  E("LAOS", "LAOS", "ลาว", "ラオス");
  E("CHINA", "CHINA", "จีน", "中国");
  E("21 – 25 FEB", "21. – 25. FEB", "21 – 25 ก.พ.", "2月21–25日");
  E("27 FEB – 01 MAR · the wedding", "27. FEB – 01. MÄR · die Hochzeit", "27 ก.พ. – 1 มี.ค. · งานแต่งงาน", "2月27日–3月1日・結婚式");
  E("01 – 04 MAR", "01. – 04. MÄR", "1 – 4 มี.ค.", "3月1–4日");
  E("04 – 06 MAR", "04. – 06. MÄR", "4 – 6 มี.ค.", "3月4–6日");
  E("the Mekong", "der Mekong", "แม่น้ำโขง", "メコン川");
  E("Wednesday, 24 Feb · 20:25 → 06:45", "Mittwoch, 24. Feb · 20:25 → 06:45", "พุธ 24 ก.พ. · 20:25 → 06:45", "2月24日（水）20:25→06:45");
  E("Thursday, 25 Feb · Arrival Day", "Donnerstag, 25. Feb · Ankunftstag", "พฤหัส 25 ก.พ. · วันเดินทางมาถึง", "2月25日（木）・到着日");
  E("Vientiane receives us: across the Mekong and into the city — the first unhurried days, everyone arriving, the wedding weekend drawing near.", "Vientiane empfängt uns: über den Mekong und in die Stadt — die ersten entspannten Tage, alle kommen an, das Hochzeitswochenende rückt näher.", "เวียงจันทน์ต้อนรับเรา ข้ามแม่น้ำโขงเข้าสู่ตัวเมือง วันแรกๆ อันผ่อนคลาย ทุกคนทยอยมาถึง สุดสัปดาห์งานแต่งงานใกล้เข้ามา", "ビエンチャンが私たちを迎えます。メコン川を渡り街へ——ゆったりした最初の日々、みんなが到着し、結婚式の週末が近づきます。");
  E("21 – 24 FEB", "21. – 24. FEB", "21 – 24 ก.พ.", "2月21–24日");
  E("21 – 24 FEB 2027", "21. – 24. FEB 2027", "21 – 24 ก.พ. 2027", "2027年2月21–24日");
  E("Your journey to Vientiane · 24 – 25 FEB 2027", "Eure Reise nach Vientiane · 24. – 25. FEB 2027", "การเดินทางสู่เวียงจันทน์ · 24 – 25 ก.พ. 2027", "ビエンチャンへの旅・2027年2月24–25日");
  E("Bangkok → Nong Khai → Vientiane · overnight package", "Bangkok → Nong Khai → Vientiane · Nachtzug-Paket", "กรุงเทพฯ → หนองคาย → เวียงจันทน์ · แพ็คเกจค้างคืน", "バンコク→ノーンカーイ→ビエンチャン・夜行パッケージ");
  E("24 FEB 2027 · 20:25 · Bangkok departure · Krung Thep Aphiwat", "24. FEB 2027 · 20:25 · Abfahrt Bangkok · Krung Thep Aphiwat", "24 ก.พ. 2027 · 20:25 · ออกจากกรุงเทพฯ · สถานีกรุงเทพอภิวัฒน์", "2027年2月24日 20:25・バンコク出発・クルンテープ・アピワット駅");
  E("Overnight · Special Express No. 25 · reserved First Class Sleeper berth", "Über Nacht · Special Express Nr. 25 · reservierte First-Class-Schlafwagenkoje", "ค้างคืน · ด่วนพิเศษขบวน 25 · ที่นอนชั้นหนึ่งจองไว้ให้", "夜行・特急25号・ファーストクラス寝台指定");
  E("25 FEB 2027 · 06:45 · Nong Khai arrival", "25. FEB 2027 · 06:45 · Ankunft Nong Khai", "25 ก.พ. 2027 · 06:45 · ถึงหนองคาย", "2027年2月25日 06:45・ノーンカーイ到着");
  E("25 FEB 2027 · Nong Khai → Vientiane · van transfer & luggage handling · included", "25. FEB 2027 · Nong Khai → Vientiane · Van-Transfer & Gepäckservice · inklusive", "25 ก.พ. 2027 · หนองคาย → เวียงจันทน์ · รถตู้รับส่งพร้อมดูแลสัมภาระ · รวมในแพ็คเกจ", "2027年2月25日・ノーンカーイ→ビエンチャン・バン送迎＆荷物サービス・込み");
  E("PER GUEST", "PRO GAST", "ต่อท่าน", "お一人あたり");
  E("Transport total", "Transportkosten gesamt", "รวมค่าเดินทาง", "移動費合計");
  E("Check-out 24 FEB 2027 is fixed — that evening the night train leaves for Vientiane. Nights are calculated automatically.", "Der Check-out am 24. FEB 2027 ist fest — an diesem Abend fährt der Nachtzug nach Vientiane. Die Nächte werden automatisch berechnet.", "เช็คเอาท์ 24 ก.พ. 2027 กำหนดตายตัว — เย็นวันนั้นรถไฟกลางคืนออกเดินทางสู่เวียงจันทน์ จำนวนคืนคำนวณให้อัตโนมัติ", "チェックアウトは2027年2月24日で確定——その夜、夜行列車がビエンチャンへ発ちます。宿泊数は自動計算されます。");
  E("Your stay in Vientiane · Souphattra Heritage Vientiane", "Euer Aufenthalt in Vientiane · Souphattra Heritage Vientiane", "ที่พักของคุณในเวียงจันทน์ · สุพัตรา เฮอริเทจ เวียงจันทน์", "ビエンチャンでの滞在・スパッタラ・ヘリテージ・ビエンチャン");
  E("Choose the arranged wedding stay — dates, room and your costs follow immediately.", "Den arrangierten Hochzeitsaufenthalt wählen — Daten, Zimmer und eure Kosten folgen sofort.", "เลือกที่พักงานแต่งงานที่จัดเตรียมไว้ วันที่ ห้องพัก และค่าใช้จ่ายแสดงทันที", "手配済みのウェディングステイを選ぶと、日程・お部屋・ご費用がすぐに表示されます。");
  E("Vientiane stays part of your journey — no accommodation through us, USD 0.", "Vientiane bleibt Teil eurer Reise — keine Unterkunft über uns, USD 0.", "เวียงจันทน์ยังเป็นส่วนหนึ่งของเส้นทางของคุณ ไม่มีที่พักผ่านเรา USD 0", "ビエンチャンは旅の一部のまま——私たち経由の宿泊なし、USD 0。");
  E("Check-in · from the confirmed wedding allocation", "Check-in · aus der bestätigten Hochzeits-Zimmerzuteilung", "เช็คอิน · จากห้องพักที่ยืนยันไว้สำหรับงานแต่งงาน", "チェックイン・確定済みウェディング客室枠から");
  E("2 nights · first night your costs, second night hosted by us · breakfast both mornings. Nights are calculated automatically.", "2 Nächte · erste Nacht eure Kosten, zweite Nacht von uns übernommen · Frühstück an beiden Morgen. Die Nächte werden automatisch berechnet.", "2 คืน · คืนแรกเป็นค่าใช้จ่ายของคุณ คืนที่สองเราดูแลให้ · อาหารเช้าทั้งสองวัน จำนวนคืนคำนวณให้อัตโนมัติ", "2泊・1泊目はご負担、2泊目は私たちがご招待・朝食は両日付き。宿泊数は自動計算されます。");
  E("1 night · same approved category amount · breakfast included. Nights are calculated automatically.", "1 Nacht · gleicher freigegebener Kategoriebetrag · Frühstück inklusive. Die Nächte werden automatisch berechnet.", "1 คืน · ราคาเท่ากับหมวดห้องที่อนุมัติ · รวมอาหารเช้า จำนวนคืนคำนวณให้อัตโนมัติ", "1泊・承認済みカテゴリーと同額・朝食付き。宿泊数は自動計算されます。");
  E("Own arrangement noted — nothing is charged for a Vientiane stay.", "Eigene Organisation vermerkt — für einen Aufenthalt in Vientiane wird nichts berechnet.", "บันทึกว่าจัดการเอง — ไม่มีค่าใช้จ่ายสำหรับที่พักในเวียงจันทน์", "ご自身での手配として承りました——ビエンチャンの宿泊費はかかりません。");
  E("27.02.2027 – 01.03.2027 · 2 nights · Vientiane", "27.02.2027 – 01.03.2027 · 2 Nächte · Vientiane", "27.02.2027 – 01.03.2027 · 2 คืน · เวียงจันทน์", "2027年2月27日–3月1日・2泊・ビエンチャン");
  E("28.02.2027 – 01.03.2027 · 1 night · Vientiane", "28.02.2027 – 01.03.2027 · 1 Nacht · Vientiane", "28.02.2027 – 01.03.2027 · 1 คืน · เวียงจันทน์", "2027年2月28日–3月1日・1泊・ビエンチャン");
  E("Check-in 27 FEB 2027 · Check-out 01 MAR 2027 · 2 nights", "Check-in 27. FEB 2027 · Check-out 01. MÄR 2027 · 2 Nächte", "เช็คอิน 27 ก.พ. 2027 · เช็คเอาท์ 1 มี.ค. 2027 · 2 คืน", "チェックイン2027年2月27日・チェックアウト3月1日・2泊");
  E("Check-in 28 FEB 2027 · Check-out 01 MAR 2027 · 1 night", "Check-in 28. FEB 2027 · Check-out 01. MÄR 2027 · 1 Nacht", "เช็คอิน 28 ก.พ. 2027 · เช็คเอาท์ 1 มี.ค. 2027 · 1 คืน", "チェックイン2027年2月28日・チェックアウト3月1日・1泊");
  E("More details", "Mehr Details", "รายละเอียดเพิ่มเติม", "詳しく見る");
  E("REQUESTED · Guest Relations will confirm", "ANGEFRAGT · Guest Relations bestätigt", "ส่งคำขอแล้ว · ฝ่ายดูแลแขกจะยืนยัน", "リクエスト済み・ゲストリレーションズが確認します");
  E("complete stay", "kompletter Aufenthalt", "ตลอดการเข้าพัก", "滞在全体");
  E("Room total", "Zimmer gesamt", "รวมค่าห้อง", "客室合計");
  E("First night · your costs — second night · hosted by Haruthai & Suthep", "Erste Nacht · eure Kosten — zweite Nacht · übernommen von Haruthai & Suthep", "คืนแรก · ค่าใช้จ่ายของคุณ — คืนที่สอง · ฮารุไทและสุเทพดูแลให้", "1泊目・ご負担——2泊目・ハルタイ＆ステープがご招待");
  E("1 night · same approved category amount · breakfast included", "1 Nacht · gleicher freigegebener Kategoriebetrag · Frühstück inklusive", "1 คืน · ราคาเท่ากับหมวดห้องที่อนุมัติ · รวมอาหารเช้า", "1泊・承認済みカテゴリーと同額・朝食付き");
  E("Complimentary stay · limited · personally coordinated by Guest Relations", "Kostenfreier Aufenthalt · begrenzt · persönlich koordiniert von Guest Relations", "เข้าพักโดยไม่มีค่าใช้จ่าย · จำนวนจำกัด · ฝ่ายดูแลแขกประสานงานให้เป็นการส่วนตัว", "無料滞在・数量限定・ゲストリレーションズが個別に調整します");
  E("Souphattra Heritage Vientiane", "Souphattra Heritage Vientiane", "สุพัตรา เฮอริเทจ เวียงจันทน์", "スパッタラ・ヘリテージ・ビエンチャン");
  E("Check-in · any day from 25 FEB 2027", "Check-in · jeder Tag ab 25. FEB 2027", "เช็คอิน · วันใดก็ได้ตั้งแต่ 25 ก.พ. 2027", "チェックイン・2027年2月25日以降の任意の日");
  E("25.02.2027 – 01.03.2027 · 4 nights · Vientiane", "25.02.2027 – 01.03.2027 · 4 Nächte · Vientiane", "25.02.2027 – 01.03.2027 · 4 คืน · เวียงจันทน์", "2027年2月25日–3月1日・4泊・ビエンチャン");
  E("26.02.2027 – 01.03.2027 · 3 nights · Vientiane", "26.02.2027 – 01.03.2027 · 3 Nächte · Vientiane", "26.02.2027 – 01.03.2027 · 3 คืน · เวียงจันทน์", "2027年2月26日–3月1日・3泊・ビエンチャン");
  E("Check-in 25 FEB 2027 · Check-out 01 MAR 2027 · 4 nights", "Check-in 25. FEB 2027 · Check-out 01. MÄR 2027 · 4 Nächte", "เช็คอิน 25 ก.พ. 2027 · เช็คเอาท์ 1 มี.ค. 2027 · 4 คืน", "チェックイン2027年2月25日・チェックアウト3月1日・4泊");
  E("Check-in 26 FEB 2027 · Check-out 01 MAR 2027 · 3 nights", "Check-in 26. FEB 2027 · Check-out 01. MÄR 2027 · 3 Nächte", "เช็คอิน 26 ก.พ. 2027 · เช็คเอาท์ 1 มี.ค. 2027 · 3 คืน", "チェックイン2027年2月26日・チェックアウト3月1日・3泊");
  E("1 night · same category rate · breakfast included", "1 Nacht · gleiche Kategorierate · Frühstück inklusive", "1 คืน · เรทหมวดห้องเดียวกัน · รวมอาหารเช้า", "1泊・同一カテゴリーレート・朝食付き");
  E("1 night · same category rate · breakfast included.", "1 Nacht · gleiche Kategorierate · Frühstück inklusive.", "1 คืน · เรทหมวดห้องเดียวกัน · รวมอาหารเช้า", "1泊・同一カテゴリーレート・朝食付き。");
  E("paid night", "bezahlte Nacht", "คืนที่ชำระ", "有料泊");
  E("paid nights", "bezahlte Nächte", "คืนที่ชำระ", "有料泊");
  E("the second wedding night · hosted by Haruthai & Suthep", "die zweite Hochzeitsnacht · übernommen von Haruthai & Suthep", "คืนที่สองของงานแต่งงาน · ฮารุไทและสุเทพดูแลให้", "結婚式の2泊目・ハルタイ＆ステープがご招待");
  E("Request this journey", "Diese Reise anfragen", "ขอจองการเดินทางนี้", "この旅程をリクエスト");
  E("Remove from journey", "Aus der Reise entfernen", "นำออกจากเส้นทาง", "旅程から外す");
  E("Your journey at a glance", "Eure Reise auf einen Blick", "เส้นทางของคุณโดยสรุป", "旅の全体像をひと目で");
  E("All nights covered", "Alle Übernachtungen abgedeckt", "ที่พักครบทุกคืน", "宿泊はすべて確保済み");
  E("All transfers covered", "Alle Transfers abgedeckt", "การเดินทางครบทุกช่วง", "移動はすべて確保済み");
  E("No accommodation gaps", "Keine Lücke bei den Übernachtungen", "ไม่มีคืนที่ขาดที่พัก", "宿泊に空白はありません");
  E("No transfer gaps", "Keine Lücke bei den Transfers", "ไม่มีช่วงเดินทางที่ขาด", "移動に空白はありません");
  E("✓ Your journey is complete", "✓ Eure Reise ist vollständig", "✓ เส้นทางของคุณครบถ้วนแล้ว", "✓ 旅の準備は完了しています");
  E("1 thing still needed", "Noch 1 Punkt offen", "เหลืออีก 1 อย่าง", "残り1件");
  E("2 things still needed", "Noch 2 Punkte offen", "เหลืออีก 2 อย่าง", "残り2件");
  E("3 things still needed", "Noch 3 Punkte offen", "เหลืออีก 3 อย่าง", "残り3件");
  E("Arrival to Bangkok", "Anreise nach Bangkok", "การเดินทางมาถึงกรุงเทพฯ", "バンコクへの到着");
  E("Departure from Bangkok", "Abreise aus Bangkok", "การเดินทางออกจากกรุงเทพฯ", "バンコクからのご出発");
  E("We still need your arrival details.", "Wir brauchen noch eure Ankunftsdetails.", "เรายังต้องการรายละเอียดการมาถึงของคุณ", "ご到着の詳細をお知らせください。");
  E("We still need your final departure / flight-home details.", "Wir brauchen noch die Details eurer Abreise / eures Heimflugs.", "เรายังต้องการรายละเอียดการเดินทางกลับ / เที่ยวบินขากลับของคุณ", "最終のご出発／帰国便の詳細をお知らせください。");
  E("Add arrival details", "Ankunftsdetails hinzufügen", "เพิ่มรายละเอียดการมาถึง", "到着詳細を追加");
  E("Your departure details (flight home, booked by you)", "Eure Abreisedetails (Heimflug, von euch gebucht)", "รายละเอียดการเดินทางกลับของคุณ (เที่ยวบินขากลับที่คุณจองเอง)", "ご出発の詳細（ご自身で予約の帰国便）");
  E("Open My Journey", "Meine Reise öffnen", "เปิด เส้นทางของฉัน", "旅のしおりを開く");
  E("✓ Journey complete", "✓ Reise vollständig", "✓ เส้นทางครบถ้วน", "✓ 旅の準備完了");
  E("Stay covered", "Übernachtung abgedeckt", "ที่พักเรียบร้อย", "宿泊確保済み");
  E("Stay still needed", "Übernachtung noch offen", "ยังไม่ได้เลือกที่พัก", "宿泊が未定");
  E("Arrival details received", "Ankunftsdetails erhalten", "ได้รับรายละเอียดการมาถึงแล้ว", "到着詳細を受領");
  E("Arrival details needed", "Ankunftsdetails fehlen", "ต้องการรายละเอียดการมาถึง", "到着詳細が必要");
  E("Details received", "Details erhalten", "ได้รับรายละเอียดแล้ว", "詳細を受領");
  E("Details needed", "Details fehlen", "ต้องการรายละเอียด", "詳細が必要");
  E("Your costs", "Eure Kosten", "ค่าใช้จ่ายของคุณ", "ご費用");
  E("Departure", "Abreise", "การเดินทางกลับ", "ご出発");
  E("Covered", "Abgedeckt", "เรียบร้อย", "確保済み");
  E("Decision needed", "Entscheidung offen", "รอการตัดสินใจ", "選択が必要");
  E("Being arranged by Khun Ket & Khun Paddy", "Wird von Khun Ket & Khun Paddy organisiert", "คุณเกตุและคุณแพดดี้กำลังจัดการให้", "クン・ケットとクン・パディが手配中");
  E("Travelling independently", "Ihr reist unabhängig", "เดินทางด้วยตัวเอง", "ご自身で移動");
  E("Wedding Stay", "Hochzeitsaufenthalt", "ที่พักช่วงงานแต่งงาน", "ウェディングステイ");
  E("Return with us", "Mit uns zurück", "กลับพร้อมกับเรา", "私たちと一緒に戻る");
  E("My own plans", "Eigene Pläne", "แผนของฉันเอง", "自分の予定で");
  E("Guest Relations support", "Guest-Relations-Unterstützung", "ให้ฝ่ายดูแลแขกช่วยเหลือ", "ゲストリレーションズのサポート");
  E("Onward from Lijiang", "Weiterreise ab Lijiang", "เดินทางต่อจากลี่เจียง", "麗江からのその先");
  E("Tell us how your journey continues after Lijiang.", "Sagt uns, wie eure Reise nach Lijiang weitergeht.", "บอกเราว่าเส้นทางของคุณต่อจากลี่เจียงเป็นอย่างไร", "麗江の後の旅の続きをお知らせください。");
  E("BOOKED", "GEBUCHT", "จองแล้ว", "予約済み");
  E("COMPLIMENTARY", "INKLUSIVE", "ไม่มีค่าใช้จ่าย", "無料ご招待");
  E("Breakfast included", "Frühstück inklusive", "รวมอาหารเช้า", "朝食付き");
  E("Reserved", "Reserviert", "สงวนไว้", "予約済み枠");
  E("Unavailable", "Nicht verfügbar", "ไม่ว่าง", "利用不可");
  E("Train · USD 55 per guest · Van Pickup & Luggage Service · USD 20 per guest", "Zug · USD 55 pro Gast · Van-Abholung & Gepäckservice · USD 20 pro Gast", "รถไฟ · USD 55 ต่อท่าน · รถตู้รับส่งพร้อมดูแลสัมภาระ · USD 20 ต่อท่าน", "列車・お一人USD 55・バン送迎＆荷物サービス・お一人USD 20");
  E("Everything is shown in the order you travel. ", "Alles erscheint in der Reihenfolge, in der ihr reist. ", "ทุกอย่างแสดงตามลำดับการเดินทางของคุณ ", "すべて旅の順番どおりに表示されます。");
  E("Hosted", "Übernommen", "เราดูแลให้", "ご招待");
  E("Booked", "Gebucht", "จองแล้ว", "予約済み");
  E("Your choice", "Eure Wahl", "คุณเลือกเอง", "ご自身で");
  E(" — Haruthai & Suthep are taking care of this for you. ", " — Haruthai & Suthep übernehmen das für euch. ", " — ฮารุไทและสุเทพดูแลส่วนนี้ให้คุณ ", " — ハルタイ＆ステープがご用意します。");
  E(" — you have selected and booked this through your journey. ", " — ihr habt das über eure Reise ausgewählt und gebucht. ", " — คุณเลือกและจองส่วนนี้ผ่านเส้นทางของคุณแล้ว ", " — 旅程から選択・予約済みです。");
  E(" — you arrange this part yourself.", " — diesen Teil organisiert ihr selbst.", " — ส่วนนี้คุณจัดการเอง", " — この部分はご自身で手配します。");
  E("View all rooms", "Alle Zimmer ansehen", "ดูห้องพักทั้งหมด", "すべてのお部屋を見る");
  E("Choose this room", "Dieses Zimmer wählen", "เลือกห้องนี้", "このお部屋を選ぶ");
  E("← Back to My Journey", "← Zurück zu Meiner Reise", "← กลับสู่เส้นทางของฉัน", "← 旅のしおりへ戻る");
  E("Your wedding stay", "Euer Hochzeitsaufenthalt", "ที่พักช่วงงานแต่งงานของคุณ", "ウェディングステイ");
  E("BOOKED · your current room", "GEBUCHT · euer aktuelles Zimmer", "จองแล้ว · ห้องปัจจุบันของคุณ", "予約済み・現在のお部屋");
  E("ACTION NEEDED", "AKTION NÖTIG", "ต้องดำเนินการ", "要選択");
  E("Your journey to Vientiane · 24 – 25 FEB 2027 · Overnight", "Eure Reise nach Vientiane · 24. – 25. FEB 2027 · über Nacht", "การเดินทางสู่เวียงจันทน์ · 24 – 25 ก.พ. 2027 · ค้างคืน", "ビエンチャンへの旅・2027年2月24–25日・夜行");
  E("Payment", "Zahlung", "การชำระเงิน", "お支払い");
  E("After your journey has been reviewed, you will receive the payment details for the costs shown in your plan.", "Sobald eure Reise geprüft wurde, erhaltet ihr die Zahlungsdetails für die in eurem Plan gezeigten Kosten.", "หลังจากตรวจสอบเส้นทางของคุณแล้ว คุณจะได้รับรายละเอียดการชำระเงินสำหรับค่าใช้จ่ายในแผนของคุณ", "旅程の確認後、プランに表示された費用のお支払い詳細をお送りします。");
  E("Still needed from you", "Noch von euch benötigt", "ยังต้องการข้อมูลจากคุณ", "ご入力をお願いします");
  E("Open details · nothing here is charged", "Offene Angaben · hier wird nichts berechnet", "รายละเอียดที่ยังเปิดอยู่ · ไม่มีการคิดค่าใช้จ่ายที่นี่", "未入力の項目・ここでは費用は発生しません");
  E("Your choice · details welcome", "Eure Wahl · Details willkommen", "คุณเลือกเอง · แจ้งรายละเอียดได้", "ご自身で・詳細をお知らせください");
  E("Before you submit", "Bevor ihr absendet", "ก่อนส่งข้อมูล", "送信の前に");
  E("I am joining", "Ich bin dabei", "ฉันเข้าร่วม", "参加します");
  E("Not joining", "Nicht dabei", "ไม่เข้าร่วม", "参加しません");
  E("I have read and understand the dress code", "Ich habe den Dresscode gelesen und verstanden", "ฉันได้อ่านและเข้าใจกฎการแต่งกายแล้ว", "ドレスコードを読み、理解しました");
  E("Dress code — action needed", "Dresscode — Bestätigung nötig", "กฎการแต่งกาย — ต้องยืนยัน", "ドレスコード——確認が必要です");
  E("The wedding · are you joining?", "Die Hochzeit · seid ihr dabei?", "งานแต่งงาน · คุณเข้าร่วมไหม", "結婚式・ご参加されますか");
  E("I have read and agree to the wedding information above.", "Ich habe die Informationen zur Hochzeit gelesen und bin damit einverstanden.", "ฉันได้อ่านและยอมรับข้อมูลเกี่ยวกับงานแต่งงานข้างต้น", "上記の結婚式に関する情報を読み、同意します。");
  E("Please confirm the wedding information above before submitting.", "Bitte bestätigt die Informationen zur Hochzeit, bevor ihr absendet.", "กรุณายืนยันข้อมูลงานแต่งงานข้างต้นก่อนส่ง", "送信の前に、上記の結婚式に関する情報のご確認をお願いします。");
  E("Book this journey", "Diese Reise buchen", "จองการเดินทางนี้", "この旅程を予約");
  E("Overnight · Bangkok → Vientiane", "Über Nacht · Bangkok → Vientiane", "ค้างคืน · กรุงเทพฯ → เวียงจันทน์", "夜行・バンコク→ビエンチャン");
  E("Your overnight journey · 24 – 25 FEB 2027 · 1 night", "Eure Nachtreise · 24. – 25. FEB 2027 · 1 Nacht", "การเดินทางค้างคืนของคุณ · 24 – 25 ก.พ. 2027 · 1 คืน", "夜行の旅・2027年2月24–25日・1泊");
  E("A Buddhist morning ceremony at Wat Ong Teu — unhurried and full of meaning.", "Eine buddhistische Morgenzeremonie im Wat Ong Teu — entspannt und voller Bedeutung.", "พิธีเช้าแบบพุทธที่วัดองค์ตื้อ เรียบง่ายและเปี่ยมความหมาย", "ワット・オントゥーでの仏教の朝の儀式——ゆったりと、意味に満ちて。");
  E("Back at the courtyard: coffee, cake and a slow midday together.", "Zurück im Innenhof: Kaffee, Kuchen und ein entspannter Mittag zusammen.", "กลับสู่ลานบ้าน กาแฟ เค้ก และช่วงกลางวันที่ผ่อนคลายด้วยกัน", "中庭に戻って——コーヒーとケーキ、ゆったりした昼のひととき。");
  E("Stillness, presence, and the vow made public in front of the people who matter most.", "Stille, Gegenwart und das Versprechen vor den Menschen, die am meisten zählen.", "ความสงบ การอยู่ตรงนั้น และคำสัญญาต่อหน้าคนที่สำคัญที่สุด", "静けさの中で、大切な人々の前で交わされる誓い。");
  E("Sunset drinks, then dinner in the courtyard garden — a long, unhurried evening together.", "Drinks zum Sonnenuntergang, dann Dinner im Gartenhof — ein langer, entspannter Abend zusammen.", "เครื่องดื่มยามอาทิตย์ตก แล้วดินเนอร์ในสวนลานบ้าน ค่ำคืนยาวๆ ที่ผ่อนคลายด้วยกัน", "夕暮れのドリンク、そして中庭でのディナー——長くゆったりとした夜を共に。");
  E("28 FEB 2027 · 09:00 AM – approx. 12:00 PM · Wat Ong Teu Temple, Vientiane · COMPLIMENTARY", "28. FEB 2027 · 09:00 – ca. 12:00 Uhr · Wat Ong Teu Tempel, Vientiane · INKLUSIVE", "28 ก.พ. 2027 · 09:00 – ประมาณ 12:00 น. · วัดองค์ตื้อ เวียงจันทน์ · ไม่มีค่าใช้จ่าย", "2027年2月28日 9:00–約12:00・ワット・オントゥー寺院・無料ご招待");
  E("28 FEB 2027 · from 12:00 · Souphattra Heritage Vientiane · COMPLIMENTARY", "28. FEB 2027 · ab 12:00 Uhr · Souphattra Heritage Vientiane · INKLUSIVE", "28 ก.พ. 2027 · ตั้งแต่ 12:00 น. · สุพัตรา เฮอริเทจ เวียงจันทน์ · ไม่มีค่าใช้จ่าย", "2027年2月28日 12:00より・スパッタラ・ヘリテージ・無料ご招待");
  E("28 FEB 2027 · 04:30 PM · Souphattra Heritage Vientiane · COMPLIMENTARY", "28. FEB 2027 · 16:30 Uhr · Souphattra Heritage Vientiane · INKLUSIVE", "28 ก.พ. 2027 · 16:30 น. · สุพัตรา เฮอริเทจ เวียงจันทน์ · ไม่มีค่าใช้จ่าย", "2027年2月28日 16:30・スパッタラ・ヘリテージ・無料ご招待");
  E("28 FEB 2027 · 07:30 PM · Souphattra Vientiane Hotel · COMPLIMENTARY", "28. FEB 2027 · 19:30 Uhr · Souphattra Vientiane Hotel · INKLUSIVE", "28 ก.พ. 2027 · 19:30 น. · โรงแรมสุพัตรา เวียงจันทน์ · ไม่มีค่าใช้จ่าย", "2027年2月28日 19:30・スパッタラ・ビエンチャン・ホテル・無料ご招待");
  E("Book this stay", "Diesen Aufenthalt buchen", "จองที่พักนี้", "この滞在を予約");
  E("Book this room", "Dieses Zimmer buchen", "จองห้องนี้", "このお部屋を予約");
  E("Remove", "Entfernen", "นำออก", "取り消す");
  E("Bangkok, Thailand", "Bangkok, Thailand", "กรุงเทพฯ ประเทศไทย", "タイ・バンコク");
  E("Bangkok Stay", "Bangkok-Aufenthalt", "ที่พักกรุงเทพฯ", "バンコクの滞在");
  E("Overnight Journey", "Nachtreise", "การเดินทางค้างคืน", "夜行の旅");
  E("24 FEB 2027 → 25 FEB 2027 · 1 night · Bangkok → Vientiane", "24. FEB 2027 → 25. FEB 2027 · 1 Nacht · Bangkok → Vientiane", "24 ก.พ. 2027 → 25 ก.พ. 2027 · 1 คืน · กรุงเทพฯ → เวียงจันทน์", "2027年2月24日→25日・1泊・バンコク→ビエンチャン");
  E("Special Express No. 25 · First Class Sleeper", "Special Express Nr. 25 · First-Class-Schlafwagen", "ด่วนพิเศษขบวน 25 · ตู้นอนชั้นหนึ่ง", "特急25号・ファーストクラス寝台");
  E("per person / night", "pro Person / Nacht", "ต่อท่าน / คืน", "お一人・1泊あたり");
  E("Party total", "Gesamt für euch", "รวมทั้งหมดของคุณ", "お二人の合計");
  E("Total contribution", "Gesamtkosten für euch", "รวมค่าใช้จ่ายของคุณ", "ご負担合計");
  E("Your arrival details (flight/train, booked by you)", "Eure Ankunftsdetails (Flug/Zug, von euch gebucht)", "รายละเอียดการมาถึงของคุณ (เที่ยวบิน/รถไฟ ที่คุณจองเอง)", "ご到着の詳細（ご自身で予約の便・列車）");
  E("Experience · Bangkok", "Erlebnis · Bangkok", "ประสบการณ์ · กรุงเทพฯ", "体験・バンコク");
  E("Whispering Cafe", "Whispering Cafe", "Whispering Cafe", "Whispering Cafe");
  E("A quiet garden escape outside the city, surrounded by trees, natural light and the relaxed atmosphere of Whispering Land.", "Ein stilles Garten-Refugium vor der Stadt — umgeben von Bäumen, natürlichem Licht und der entspannten Atmosphäre von Whispering Land.", "ที่หลบพักอันเงียบสงบในสวนนอกเมือง ล้อมรอบด้วยต้นไม้ แสงธรรมชาติ และบรรยากาศผ่อนคลายของ Whispering Land", "街の外の静かな庭園の隠れ家——木々と自然光、Whispering Landのくつろいだ空気に包まれて。");
  E("Sam Phran · Nakhon Pathom", "Sam Phran · Nakhon Pathom", "สามพราน · นครปฐม", "サームプラーン・ナコーンパトム");
  E("Homemade food, bakery and coffee in a garden setting shaped around nature.", "Hausgemachtes Essen, Bäckerei und Kaffee in einem Garten, der um die Natur herum gestaltet ist.", "อาหารโฮมเมด เบเกอรี่ และกาแฟ ในสวนที่ออกแบบให้กลมกลืนกับธรรมชาติ", "自然に寄り添う庭で味わう、自家製の料理とベーカリー、コーヒー。");
  E("Whispering Cafe — the white facade and French-style doors of Whispering Land", "Whispering Cafe — die weiße Fassade und französischen Türen von Whispering Land", "Whispering Cafe — อาคารสีขาวและประตูสไตล์ฝรั่งเศสของ Whispering Land", "Whispering Cafe——Whispering Landの白い外壁とフレンチドア");
  E("Whispering Cafe — timber beams, spiral stair and vintage furniture inside", "Whispering Cafe — Holzbalken, Wendeltreppe und Vintage-Möbel im Inneren", "Whispering Cafe — คานไม้ บันไดวน และเฟอร์นิเจอร์วินเทจภายใน", "Whispering Cafe——梁とらせん階段、ヴィンテージ家具の室内");
  E("Whispering Cafe — the bakery counter beneath dried flowers", "Whispering Cafe — die Bäckerei-Theke unter Trockenblumen", "Whispering Cafe — เคาน์เตอร์เบเกอรี่ใต้ดอกไม้แห้ง", "Whispering Cafe——ドライフラワーの下のベーカリーカウンター");
  E("day escape · relaxed", "Tagesausflug · entspannt", "หนีเที่ยวหนึ่งวัน · ผ่อนคลาย", "日帰りの休息・リラックス");
  E("A quiet garden escape outside the city, surrounded by trees, natural light and the relaxed atmosphere of Whispering Land. Homemade food, bakery and coffee in a garden setting shaped around nature.", "Ein stilles Garten-Refugium vor der Stadt — Bäume, natürliches Licht und die entspannte Atmosphäre von Whispering Land. Hausgemachtes Essen, Bäckerei und Kaffee in einem Garten, der um die Natur herum gestaltet ist.", "ที่หลบพักอันเงียบสงบในสวนนอกเมือง ท่ามกลางต้นไม้ แสงธรรมชาติ และบรรยากาศผ่อนคลายของ Whispering Land อาหารโฮมเมด เบเกอรี่ และกาแฟในสวนที่ออกแบบให้กลมกลืนกับธรรมชาติ", "街の外の静かな庭園の隠れ家——木々と自然光、Whispering Landのくつろいだ空気。自然に寄り添う庭で自家製の料理とベーカリー、コーヒーを。");
  E("A travel guide through the parts of the journey you are joining — places and moments to discover. Nothing here is a booking.", "Ein Reiseführer durch die Teile eurer Reise — Orte und Momente zum Entdecken. Nichts hiervon ist eine Buchung.", "คู่มือเดินทางผ่านช่วงต่างๆ ของเส้นทางของคุณ สถานที่และช่วงเวลาให้ค้นพบ ไม่มีสิ่งใดเป็นการจอง", "旅の各章をめぐるトラベルガイド——出会う場所と瞬間。ここに予約はありません。");
  E("Thailand", "Thailand", "ประเทศไทย", "タイ");
  E("Laos", "Laos", "ลาว", "ラオス");
  E("China", "China", "จีน", "中国");
  E("22 – 24 FEB 2027", "22. – 24. FEB 2027", "22 – 24 ก.พ. 2027", "2027年2月22–24日");
  E("25 FEB 2027 onward", "ab 25. FEB 2027", "ตั้งแต่ 25 ก.พ. 2027", "2027年2月25日以降");
  E("01 – 06 MAR 2027", "01. – 06. MÄR 2027", "1 – 6 มี.ค. 2027", "2027年3月1–6日");
  E("Experiences for this chapter follow soon.", "Die Erlebnisse für dieses Kapitel folgen bald.", "ประสบการณ์สำหรับช่วงนี้จะตามมาเร็วๆ นี้", "この章の体験は近日ご案内します。");
  E("Whispering Land: Provence-inspired architecture with Scandinavian restraint — French-style doors, natural light, garden and mature planting, vintage furniture and calm, adaptable spaces.", "Whispering Land: provenceinspirierte Architektur mit skandinavischer Zurückhaltung — französische Türen, natürliches Licht, Garten und alter Baumbestand, Vintage-Möbel und ruhige, wandelbare Räume.", "Whispering Land สถาปัตยกรรมแรงบันดาลใจโพรวองซ์ผสมความเรียบง่ายแบบสแกนดิเนเวีย ประตูสไตล์ฝรั่งเศส แสงธรรมชาติ สวนและต้นไม้ใหญ่ เฟอร์นิเจอร์วินเทจ และพื้นที่อันสงบ", "Whispering Land——プロヴァンスに想を得た建築と北欧的な抑制。フレンチドア、自然光、庭と成熟した緑、ヴィンテージ家具、静かで自在な空間。");
  E("A design-led Bangkok dining room where Thai flavours meet modern European form.", "Ein designgeführter Bangkoker Speisesaal, wo Thai-Aromen auf moderne europäische Form treffen.", "ห้องอาหารกรุงเทพฯ ที่นำด้วยดีไซน์ รสไทยพบฟอร์มยุโรปสมัยใหม่", "デザイン主導のバンコクのダイニング——タイの味と現代ヨーロッパの造形。");
  E("A luxury design café stop — couture interiors, French pastry and contemporary calm.", "Ein Luxus-Design-Café-Stopp — Couture-Interieur, französische Patisserie, zeitgenössische Ruhe.", "คาเฟ่ดีไซน์หรู อินทีเรียกูตูร์ ขนมอบฝรั่งเศส และความสงบร่วมสมัย", "ラグジュアリーなデザインカフェ——クチュールの内装、フランス菓子、現代の静けさ。");
  E("The riverfront landmark — architecture, design floors and the Chao Phraya at golden hour.", "Das Wahrzeichen am Fluss — Architektur, Design-Etagen und der Chao Phraya zur goldenen Stunde.", "แลนด์มาร์กริมแม่น้ำ สถาปัตยกรรม ชั้นดีไซน์ และเจ้าพระยายามแสงทอง", "川辺のランドマーク——建築とデザインフロア、黄金色のチャオプラヤー。");
  E("A Bangkok dining destination for contemporary Thai cooking.", "Eine Bangkoker Adresse für zeitgenössische Thai-Küche.", "จุดหมายอาหารไทยร่วมสมัยของกรุงเทพฯ", "現代タイ料理のためのバンコクのダイニング。");
  E("One of the city's great bars — Buenos Aires glamour, considered drinks, late light.", "Eine der großen Bars der Stadt — Buenos-Aires-Glamour, durchdachte Drinks, spätes Licht.", "หนึ่งในบาร์ชั้นเยี่ยมของเมือง กลามัวร์บัวโนสไอเรส เครื่องดื่มพิถีพิถัน แสงยามดึก", "街を代表するバー——ブエノスアイレスの華やぎ、丁寧な一杯、遅い時間の光。");
  E("A house of roses — a visual café where Italian fusion meets Thai sweetness.", "Ein Haus der Rosen — ein visuelles Café, wo italienische Fusion auf thailändische Süße trifft.", "บ้านกุหลาบ คาเฟ่สายวิชวลที่ฟิวชันอิตาเลียนพบความหวานแบบไทย", "薔薇の館——イタリアンフュージョンとタイの甘みが出会うヴィジュアルカフェ。");
  E("Coffee and bakery in a room built around light and pause.", "Kaffee und Bäckerei in einem Raum, gebaut um Licht und Pause.", "กาแฟและเบเกอรี่ในห้องที่ออกแบบรอบแสงและการหยุดพัก", "光と小休止のためにつくられた部屋で、コーヒーとベーカリーを。");
  E("Bangkok's museum of contemporary art — bold architecture and public space by the expressway.", "Bangkoks Museum für zeitgenössische Kunst — kühne Architektur und öffentlicher Raum am Expressway.", "พิพิธภัณฑ์ศิลปะร่วมสมัยของกรุงเทพฯ สถาปัตยกรรมโดดเด่นและพื้นที่สาธารณะ", "バンコクの現代美術館——大胆な建築と公共空間。");
  E("Thonglor's vertical village — one evening, many kitchens, easy drinks in between.", "Thonglors vertikales Dorf — ein Abend, viele Küchen, entspannte Drinks dazwischen.", "หมู่บ้านแนวตั้งของทองหล่อ ค่ำคืนเดียว หลากครัว เครื่องดื่มสบายๆ คั่นกลาง", "トンローの垂直の村——ひと晩で多くの厨房と気軽な一杯を。");
  E("Siamese boat noodles, elevated — a Bangkok classic done beautifully.", "Siamesische Boat Noodles, veredelt — ein Bangkoker Klassiker, schön gemacht.", "ก๋วยเตี๋ยวเรือแบบยกระดับ คลาสสิกกรุงเทพฯ ที่ทำอย่างงดงาม", "洗練されたボートヌードル——美しく仕上げたバンコクの定番。");
  E("The new green heart above Silom — architecture, park levels and city views.", "Das neue grüne Herz über Silom — Architektur, Parkebenen und Stadtblicke.", "หัวใจสีเขียวแห่งใหม่เหนือสีลม สถาปัตยกรรม สวนหลายชั้น และวิวเมือง", "シーロムの上の新しい緑の心臓部——建築、パークレベル、街の眺め。");
  E("A quiet hour of Thai wellness before the journey continues.", "Eine stille Stunde Thai-Wellness, bevor die Reise weitergeht.", "หนึ่งชั่วโมงอันเงียบสงบของเวลเนสไทยก่อนเดินทางต่อ", "旅の続きの前に、タイ式ウェルネスの静かな1時間。");
  E("Refined hotel pâtisserie — French pastry in the Four Seasons' calm.", "Feine Hotel-Patisserie — französisches Gebäck in der Ruhe des Four Seasons.", "พาทิสเซอรีโรงแรมอันประณีต ขนมอบฝรั่งเศสในความสงบของโฟร์ซีซั่นส์", "洗練されたホテルパティスリー——フォーシーズンズの静けさの中で。");
  E("Cantonese charcoal barbecue — smoke, lacquer and generations of craft.", "Kantonesisches Holzkohle-Barbecue — Rauch, Lack und Generationen von Handwerk.", "บาร์บีคิวถ่านกวางตุ้ง ควัน เงาเคลือบ และฝีมือหลายชั่วอายุ", "広東式炭火バーベキュー——煙と照り、受け継がれた手仕事。");
  E("The Vientiane breakfast institution — baguettes, broth and morning light.", "Die Frühstücksinstitution von Vientiane — Baguettes, Brühe und Morgenlicht.", "สถาบันอาหารเช้าแห่งเวียงจันทน์ บาแก็ต น้ำซุป และแสงยามเช้า", "ビエンチャンの朝食の名店——バゲットとスープ、朝の光。");
  E("The golden stupa — Laos' national symbol, radiant in the morning.", "Die goldene Stupa — Laos' Nationalsymbol, strahlend am Morgen.", "พระธาตุหลวงสีทอง สัญลักษณ์ของชาติลาว เปล่งประกายยามเช้า", "黄金の仏塔——朝に輝くラオスの国の象徴。");
  E("Lao and Thai barbecue at the water's edge — riverside landscape and slow midday.", "Lao- und Thai-Barbecue am Wasser — Fluss-Landschaft und langsamer Mittag.", "บาร์บีคิวลาวและไทยริมน้ำ ทิวทัศน์ริมแม่น้ำและเที่ยงวันอันเนิบช้า", "水辺のラオ＆タイ・バーベキュー——川辺の風景とゆるやかな昼。");
  E("An easy Vientiane evening — coffee turned to drinks as the city softens.", "Ein leichter Vientiane-Abend — aus Kaffee werden Drinks, während die Stadt weicher wird.", "ค่ำคืนสบายๆ ในเวียงจันทน์ จากกาแฟสู่เครื่องดื่มเมื่อเมืองผ่อนคลายลง", "気楽なビエンチャンの夜——街が和らぐ頃、コーヒーからドリンクへ。");
  E("Show details", "Details anzeigen", "ดูรายละเอียด", "詳細を見る");
  E("Hide details", "Details schließen", "ซ่อนรายละเอียด", "詳細を閉じる");
  E("Continue", "Weiter", "ดำเนินการต่อ", "次へ");
  E("Back", "Zurück", "ย้อนกลับ", "戻る");
  E("Save", "Speichern", "บันทึก", "保存");
  E("Saved", "Gespeichert", "บันทึกแล้ว", "保存しました");
  E("Log out", "Abmelden", "ออกจากระบบ", "ログアウト");
  E("Website", "Website", "เว็บไซต์", "ウェブサイト");
  E("Invitation", "Einladung", "บัตรเชิญ", "招待状");
  E("View details", "Details ansehen", "ดูรายละเอียด", "詳細を見る");
  E("Hide details", "Details schließen", "ซ่อนรายละเอียด", "詳細を閉じる");
  E("Compare", "Vergleichen", "เปรียบเทียบ", "比較");
  E("Compare rooms", "Zimmer vergleichen", "เปรียบเทียบห้องพัก", "客室を比較");
  E("Edit", "Bearbeiten", "แก้ไข", "編集");
  E("Review", "Übersicht", "สรุป", "全体のまとめ");
  E("Send", "Senden", "ส่ง", "送信");
  E("Close", "Schließen", "ปิด", "閉じる");
  E("Guest Relations will confirm the arrangement", "Guest Relations bestätigt die Abstimmung persönlich", "ฝ่ายดูแลแขกจะยืนยันการจัดเตรียมให้", "ゲストリレーションズが手配を確定します");
  E("To finalize with Guest Relations", "Mit Guest Relations abzustimmen", "รอสรุปกับฝ่ายดูแลแขก", "ゲストリレーションズと最終調整");
  E("Total costs", "Gesamtkosten für euch", "ค่าใช้จ่ายทั้งหมด", "費用の合計");
  E("Hosted for you", "Von Haruthai & Suthep für euch übernommen", "เจ้าภาพดูแลให้", "おもてなしとしてご招待");
  E("Your journey", "Eure Reise", "การเดินทางของคุณ", "旅の概要");
  E("Your route", "Eure Route", "เส้นทางของคุณ", "ルート");

  /* ---- private navigation ---- */
  E("My Journey", "Meine Reise", "เส้นทางของฉัน", "旅のしおり");
  E("My Travel", "Mein Reiseweg", "การเดินทางของฉัน", "旅の手配");
  E("My Stay", "Mein Aufenthalt", "ที่พักของฉัน", "宿泊");
  E("My Wedding", "Mein Hochzeitsprogramm", "กำหนดการงานแต่ง", "当日の流れ");
  E("My Details", "Meine Angaben", "ข้อมูลของฉัน", "ゲスト情報");
  E("My Costs", "Meine Kosten", "ค่าใช้จ่ายของฉัน", "費用のご案内");

  /* ---- public navigation / chrome ---- */
  E("Journey", "Die Reise", "เส้นทาง", "旅");
  E("Stay", "Aufenthalt", "ที่พัก", "滞在");
  E("Wedding", "Die Hochzeit", "งานแต่งงาน", "結婚式");
  E("Travel", "Anreise", "การเดินทาง", "アクセス");
  E("Guest Area", "Gästebereich", "ส่วนสำหรับแขก", "ゲストエリア");
  E("MENU", "MENÜ", "เมนู", "メニュー");
  E("TOP", "NACH OBEN", "กลับด้านบน", "トップへ");
  E("join the journey", "Teil der Reise werden", "ร่วมเดินทางไปกับเรา", "旅のはじまりへ");

  /* ---- public sections ---- */
  E("The Moments", "Die Momente", "ช่วงเวลาสำคัญ", "セレモニー");
  E("The Journey Map", "Die Reisekarte", "แผนที่การเดินทาง", "旅の地図");
  E("The Places", "Die Orte", "สถานที่", "会場");
  E("The Weekend, in Order", "Das Wochenende, der Reihe nach", "ลำดับวันงาน", "週末の流れ");
  E("Before You Travel", "Vor der Reise", "ก่อนออกเดินทาง", "ご出発前に");
  E("Next Steps", "Die nächsten Schritte", "ขั้นตอนถัดไป", "次のステップ");
  E("Your Guest Area", "Euer Gästebereich", "ส่วนสำหรับแขกของคุณ", "ゲストエリア");
  E("The Pre Wedding Journey", "Die Reise vor der Hochzeit", "การเดินทางก่อนวันงาน", "ウェディング前の旅");
  E("Souphattra Vientiane Hotel", "Souphattra Vientiane Hotel", "โรงแรมสุพัตรา เวียงจันทน์", "スパッタラ・ビエンチャン・ホテル");
  E("· Souphattra Vientiane Hotel", "· Souphattra Vientiane Hotel", "· โรงแรมสุพัตรา เวียงจันทน์", "· スパッタラ・ビエンチャン・ホテル");
  E("The Alms Giving", "Das Morgenritual", "พิธีตักบาตร", "托鉢の儀");
  E("The Vow Ceremony", "Das Eheversprechen", "พิธีกล่าวคำสัญญา", "誓いの式");
  E("The Wedding Dinner", "Das Hochzeitsdinner", "งานเลี้ยงฉลองมงคลสมรส", "ウェディングディナー");
  E("Alms Giving", "Morgenritual", "พิธีตักบาตร", "托鉢の儀");
  E("Vow Ceremony", "Eheversprechen", "พิธีกล่าวคำสัญญา", "誓いの式");
  E("Wedding Dinner", "Hochzeitsdinner", "งานเลี้ยงมงคลสมรส", "ウェディングディナー");
  E("Good to know.", "Gut zu wissen.", "เรื่องน่ารู้", "ご案内");
  E("Six stops,", "Sechs Stationen,", "หกจุดหมาย", "六つの停車地、");
  E("one journey.", "eine Reise.", "หนึ่งการเดินทาง", "ひとつの旅。");
  E("How the days unfold.", "Wie die Tage sich entfalten.", "แต่ละวันจะเป็นอย่างไร", "日々のながれ");
  E("How to say yes.", "So sagt ihr zu.", "ตอบรับคำเชิญอย่างไร", "ご返答の方法");
  E("Where the celebration unfolds.", "Wo gefeiert wird.", "งานฉลองจะจัดขึ้นที่ใด", "祝宴の舞台");
  E("Where you wake up.", "Wo ihr aufwacht.", "ที่ที่คุณจะตื่นนอน", "目覚める場所");
  E("The rhythm", "Der Rhythmus", "จังหวะ", "メコンの");
  E("of the Mekong.", "des Mekong.", "ของแม่น้ำโขง", "リズム。");
  E("The details", "Die Details", "รายละเอียด", "詳細は");
  E("find you.", "finden euch.", "จะไปหาคุณเอง", "あなたの元へ。");
  E("See you", "Wir sehen uns", "แล้วพบกัน", "ラオスで");
  E("in Laos?", "in Laos?", "ที่ลาวนะ", "会いましょう");

  /* ---- Guest Area step chrome ---- */
  E("Which roads", "Welche Wege", "เส้นทางใด", "どの道が");
  E("bring you to us?", "führen euch zu uns?", "จะพาคุณมาหาเรา", "あなたを届けてくれますか");
  E("Getting you", "Ankommen", "รับส่งคุณ", "行きも帰りも");
  E("here and home.", "und heimkehren.", "ทั้งไปและกลับ", "安心して。");
  E("A slower hour,", "Eine langsamere Stunde,", "ชั่วโมงที่ช้าลง", "ゆったりとした時間を、");
  E("if you like.", "wenn ihr mögt.", "หากคุณต้องการ", "お好みで。");
  E("Thank you.", "Danke.", "ขอบคุณ", "ありがとうございます。");
  E("Registration received", "Registrierung eingegangen", "ได้รับการลงทะเบียนแล้ว", "ご登録を受け付けました");
  E("Your journey is with Guest Relations", "Khun Ket und Khun Paddy kümmern sich jetzt persönlich um eure Reise", "คุณเกตุและคุณแพดดี้กำลังดูแลเส้นทางของคุณเป็นการส่วนตัว", "クン・ケットとクン・パディが、旅の準備を直接お引き受けしています");
  E("We’re taking care of", "Darum kümmern wir uns", "เราดูแลให้ทั้งหมดนี้", "私たちにお任せください");
  E("Return to your journey", "Zurück zu eurer Reise", "กลับไปที่การเดินทางของคุณ", "旅の画面に戻る");

  /* ---- MY TRAVEL ---- */
  E("How would you like to travel to Vientiane?", "Wie möchtet ihr nach Vientiane reisen?", "คุณอยากเดินทางไปเวียงจันทน์อย่างไร", "ビエンチャンへはどのように向かいますか？");
  E("Choose the way that suits you.",
    "Wählt den Weg, der zu euch passt.",
    "เลือกวิธีที่เหมาะกับคุณ",
    "ご自身に合う行き方をお選びください。")
  E("The Overnight Train", "Der Nachtzug", "รถไฟตู้นอน", "夜行列車");
  E("The Bangkok Journey", "Die Bangkok-Reise", "ทริปกรุงเทพฯ", "バンコクの旅");
  E("Arriving independently in Vientiane", "Eigenständige Anreise nach Vientiane", "เดินทางมาเวียงจันทน์ด้วยตัวเอง", "ご自身でビエンチャンへ");
  E("Fly or travel on your own schedule; we meet you there.", "Fliegt oder reist nach eurem eigenen Plan; wir empfangen euch dort.", "บินหรือเดินทางตามแผนของคุณเอง แล้วพบกันที่นั่น", "ご自身の予定で移動を。現地でお迎えします。");
  E("I’m joining", "Ich bin dabei", "เข้าร่วม", "参加します");
  E("Joining the train", "Im Nachtzug dabei", "ร่วมเดินทางด้วยรถไฟ", "夜行列車で参加");
  E("I’ll arrive independently", "Ich reise eigenständig an", "ฉันจะเดินทางมาเอง", "自分で向かいます");
  E("Arriving independently", "Eigenständige Anreise", "เดินทางมาเอง", "自力での到着");
  E("Join the waitlist", "Auf die Warteliste", "เข้ารายชื่อรอ", "キャンセル待ちに登録");
  E("Not joining", "Nicht dabei", "ไม่เข้าร่วม", "参加しません");
  E("The night train, arranged around you", "Der Nachtzug, um euch herum arrangiert", "รถไฟตู้นอนที่จัดเตรียมเพื่อคุณ", "あなたに合わせて手配する夜行列車");
  E("How would you like us to arrange your arrival?", "Wie dürfen wir eure Ankunft arrangieren?", "ให้เราจัดการการมาถึงของคุณอย่างไรดี", "ご到着の手配はいかがいたしますか？");
  E("Need something different?", "Etwas anderes gewünscht?", "ต้องการแบบอื่น?", "別の手配をご希望ですか？");
  E("Your departure", "Eure Abreise", "การเดินทางกลับของคุณ", "ご出発");
  E("Departure services", "Abreise-Services", "บริการขากลับ", "出発時のサービス");
  E("Add to journey", "In die Reise aufnehmen", "เพิ่มในการเดินทาง", "旅に追加");
  E("Remove from journey", "Aus der Reise entfernen", "นำออกจากการเดินทาง", "旅から外す");
  E("Your Bangkok stay", "Euer Aufenthalt in Bangkok", "ที่พักของคุณในกรุงเทพฯ", "バンコクでのご滞在");
  E("Request this stay", "Diesen Aufenthalt anfragen", "ขอเข้าพักที่นี่", "この滞在をリクエスト");
  E("Request this room", "Dieses Zimmer anfragen", "ขอห้องนี้", "この客室をリクエスト");
  E("The Post Wedding Journey", "Die Reise nach der Hochzeit", "การเดินทางหลังงานแต่ง", "ウェディング後の旅");
  E("We would love to join", "Wir sind sehr gern dabei", "เรายินดีเข้าร่วม", "ぜひ参加したいです");
  E("Not this time", "Diesmal nicht", "ครั้งนี้ขอผ่านก่อน", "今回は見送ります");
  E("Your onward journey", "Eure Weiterreise", "การเดินทางต่อของคุณ", "その後のご旅程");
  E("Return to Bangkok with us", "Mit uns zurück nach Bangkok", "กลับกรุงเทพฯ พร้อมเรา", "私たちと一緒にバンコクへ");
  E("I’ll arrange my own onward travel", "Ich organisiere meine Weiterreise selbst", "ฉันจะจัดการเดินทางต่อเอง", "自分で手配します");
  E("Request Guest Relations support", "Unterstützung von Guest Relations anfragen", "ขอความช่วยเหลือจากฝ่ายดูแลแขก", "ゲストリレーションズに相談");
  E("Return to Bangkok with us, continue elsewhere, or make your own plans.", "Kehrt mit uns nach Bangkok zurück, reist weiter oder plant selbst.", "กลับกรุงเทพฯ พร้อมเรา เดินทางต่อที่อื่น หรือวางแผนเองก็ได้", "一緒にバンコクへ戻るのも、別の地へ進むのも、ご自身の計画も自由です。");

  /* ---- MY STAY / rooms ---- */
  E("Size", "Größe", "ขนาด", "広さ");
  E("Bed", "Bett", "เตียง", "ベッド");
  E("Guests", "Gäste", "ผู้เข้าพัก", "定員");
  E("Where", "Lage", "ทำเล", "所在地");
  E("Availability", "Verfügbarkeit", "ห้องว่าง", "空き状況");
  E("Contribution", "Kosten", "ส่วนร่วม", "ご負担分");
  E("Your stay", "Euer Aufenthalt", "ที่พักของคุณ", "ご滞在");
  E("Bed preference", "Bettwunsch", "รูปแบบเตียงที่ต้องการ", "ベッドの希望");
  E("Special request", "Besonderer Wunsch", "คำขอพิเศษ", "特別なご要望");
  E("Selected", "Ausgewählt", "เลือกแล้ว", "選択済み");
  E("Fully allocated", "Vollständig vergeben", "เต็มแล้ว", "満室");
  E("Reserved", "Reserviert", "สงวนไว้", "予約済み");
  E("Reserved for the wedding family", "Reserviert für die Hochzeitsfamilie", "สงวนไว้สำหรับครอบครัวเจ้าภาพ", "ご親族のために確保");
  E("Alternative stay", "Alternative Unterkunft", "ที่พักทางเลือก", "もう一つの滞在");
  E("Private Residence", "Private Residenz", "เรสซิเดนซ์ส่วนตัว", "プライベートレジデンス");

  /* ---- MY WEDDING ---- */
  E("The Vow Ceremony is the shared heart of the wedding day. Around it, choose the additional moments that feel right for you.",
    "Das Eheversprechen ist das gemeinsame Herz des Hochzeitstags. Darum herum wählt ihr die Momente, die sich für euch richtig anfühlen.",
    "พิธีกล่าวคำสัญญาคือหัวใจที่ทุกคนแบ่งปันร่วมกันของวันแต่งงาน ส่วนช่วงเวลาอื่น เลือกร่วมได้ตามที่เหมาะกับคุณ",
    "誓いのセレモニーは、結婚式の日にみなで分かち合う中心です。そのまわりの時間は、ご自身に合うものをお選びください。")
  E("Dress code", "Dresscode", "การแต่งกาย", "ドレスコード");
  E("The dress code is part of this moment and applies to everyone attending. Please make sure you are comfortable following it before confirming your attendance. If you are unsure about anything, Guest Relations will be happy to help you prepare.", "Der Dresscode gehört zu diesem Moment und gilt für alle Anwesenden. Bitte vergewissert euch, dass ihr euch damit wohlfühlt, bevor ihr eure Teilnahme bestätigt. Bei Fragen hilft euch Guest Relations gern bei der Vorbereitung.", "การแต่งกายเป็นส่วนหนึ่งของช่วงเวลานี้และใช้กับผู้ร่วมงานทุกท่าน โปรดแน่ใจว่าคุณสะดวกใจก่อนยืนยันเข้าร่วม หากไม่แน่ใจสิ่งใด ฝ่ายดูแลแขกยินดีช่วยเตรียมตัวให้", "ドレスコードはこのひとときの一部であり、ご参列の皆さまにお願いしています。ご出席の確定前に、無理なくお召しいただけるかご確認ください。ご不明な点は、ゲストリレーションズが喜んでお手伝いします。");
  E("I have read and understand the dress code", "Ich habe den Dresscode gelesen und verstanden", "ฉันได้อ่านและเข้าใจข้อกำหนดการแต่งกายแล้ว", "ドレスコードを読み、理解しました");

  /* ---- MY PROFILE ---- */
  E("Email", "E-Mail", "อีเมล", "メールアドレス");
  E("Phone number · with country code", "Telefonnummer · mit Ländervorwahl", "หมายเลขโทรศัพท์ · พร้อมรหัสประเทศ", "電話番号（国番号付き）");
  E("Date of birth", "Geburtsdatum", "วันเกิด", "生年月日");
  E("Food, dietary & allergies", "Essen, Ernährung & Allergien", "อาหาร โภชนาการ และภูมิแพ้", "お食事・アレルギー");
  E("Dietary preference", "Ernährungsweise", "รูปแบบอาหาร", "食事のご希望");
  E("Any food allergies?", "Lebensmittelallergien?", "แพ้อาหารหรือไม่?", "食物アレルギーはありますか？");
  E("Exactly what should the kitchens know?", "Was genau sollen die Küchen wissen?", "ครัวควรทราบอะไรบ้าง?", "厨房に伝えるべき内容をご記入ください");
  E("Yes", "Ja", "มี", "あり");
  E("No", "Nein", "ไม่มี", "なし");
  E("A little about you", "Ein wenig über euch", "เล่าถึงตัวคุณสักนิด", "あなたのこと、少しだけ");
  E("These little preferences help Guest Relations shape quiet surprises. Nothing is ever displayed back.", "Diese kleinen Vorlieben helfen Guest Relations, stille Überraschungen zu gestalten. Nichts davon wird je angezeigt.", "รายละเอียดเล็ก ๆ เหล่านี้ช่วยให้ฝ่ายดูแลแขกเตรียมเซอร์ไพรส์เงียบ ๆ ได้ และจะไม่ถูกนำมาแสดงที่ใด", "この小さなお好みが、ささやかなサプライズづくりに役立ちます。内容が表示されることはありません。");
  E("What’s your favourite food?", "Was ist euer Lieblingsessen?", "อาหารโปรดของคุณคืออะไร?", "好きな食べ物は？");
  E("What’s your favourite drink?", "Was ist euer Lieblingsgetränk?", "เครื่องดื่มโปรดของคุณคืออะไร?", "好きな飲み物は？");
  E("How do you like your coffee?", "Wie trinkt ihr euren Kaffee?", "คุณชอบกาแฟแบบไหน?", "コーヒーはどのように？");
  E("What tea do you love?", "Welchen Tee liebt ihr?", "ชาแบบไหนที่คุณรัก?", "お気に入りのお茶は？");
  E("What’s your favourite snack?", "Was ist euer Lieblingssnack?", "ของว่างโปรดของคุณคืออะไร?", "好きなおやつは？");
  E("What’s your favourite colour?", "Was ist eure Lieblingsfarbe?", "สีโปรดของคุณคือสีอะไร?", "好きな色は？");
  E("What flowers do you love?", "Welche Blumen liebt ihr?", "ดอกไม้ที่คุณรักคือดอกอะไร?", "好きな花は？");
  E("What’s a book you love?", "Welches Buch liebt ihr?", "หนังสือที่คุณรักคือเล่มไหน?", "好きな本は？");
  E("What’s a film you love?", "Welchen Film liebt ihr?", "ภาพยนตร์ที่คุณรักคือเรื่องไหน?", "好きな映画は？");
  E("What’s a song you never skip?", "Welchen Song überspringt ihr nie?", "เพลงที่คุณไม่เคยกดข้ามคือเพลงไหน?", "つい聴き入ってしまう曲は？");
  E("What always makes you feel at home?", "Was gibt euch immer ein Zuhause-Gefühl?", "อะไรที่ทำให้คุณรู้สึกเหมือนอยู่บ้านเสมอ?", "いつでも「我が家」を感じるものは？");
  E("After a long day, what do you love to find waiting for you?", "Was findet ihr nach einem langen Tag am liebsten vor?", "หลังวันอันยาวนาน คุณอยากให้อะไรรอคุณอยู่?", "長い一日の終わりに、待っていてほしいものは？");
  E("Passport · identity page", "Reisepass · Datenseite", "หนังสือเดินทาง · หน้าข้อมูล", "パスポート（顔写真ページ）");
  E("One photo or scan of the passport identity page is all we need. Used only where required for travel arrangements coordinated by Guest Relations.", "Ein Foto oder Scan der Passdatenseite genügt. Verwendet nur, wo es für die von Guest Relations koordinierten Reisearrangements nötig ist.", "เพียงรูปถ่ายหรือสแกนหน้าข้อมูลหนังสือเดินทางหนึ่งภาพก็เพียงพอ ใช้เฉพาะเมื่อจำเป็นสำหรับการจัดการเดินทางโดยฝ่ายดูแลแขกเท่านั้น", "パスポートの顔写真ページの写真またはスキャン1枚だけで結構です。ゲストリレーションズが調整する旅の手配に必要な場合にのみ使用します。");
  E("Select passport file", "Passdatei auswählen", "เลือกไฟล์หนังสือเดินทาง", "パスポートのファイルを選択");
  E("Remove", "Entfernen", "นำออก", "削除");

  /* ---- MY CONTRIBUTION ---- */
  E("Here you can see which costs you cover yourself and what Haruthai & Suthep are hosting for you.",
    "Hier seht ihr auf einen Blick, welche Kosten ihr selbst übernehmt und was Haruthai & Suthep für euch übernehmen.",
    "ที่นี่คุณเห็นได้ทันทีว่าค่าใช้จ่ายใดคุณดูแลเอง และส่วนใดหฤทัยและสุเทพดูแลให้",
    "ご自身でご負担いただく費用と、ハルタイ＆ステープがおもてなしする部分を、ここでひと目でご覧いただけます。")
  E("The Wedding", "Die Hochzeit", "งานแต่งงาน", "結婚式");
  E("The Journey", "Die Reise", "เส้นทาง", "旅");
  E("Post-Wedding Journey", "Reise nach der Hochzeit", "การเดินทางหลังวันงาน", "ウェディング後の旅");
  E("Optional · Before the wedding", "Optional · Vor der Hochzeit", "ทางเลือก · ก่อนวันงาน", "任意・挙式前");
  E("Main Event · Vientiane", "Hauptereignis · Vientiane", "งานหลัก · เวียงจันทน์", "メインイベント・ビエンチャン");
  E("Optional · After the wedding", "Optional · Nach der Hochzeit", "ทางเลือก · หลังวันงาน", "任意・挙式後");
  E("Genuinely open arrangements · nothing here is charged", "Wirklich offene Abstimmungen · nichts davon wird berechnet", "รายการที่ยังรอสรุปจริง ๆ · ไม่มีการเรียกเก็บใด ๆ", "調整中の項目です。料金は発生しません");
  E("Personal airport welcome and arrival coordination", "Persönlicher Flughafenempfang und Ankunftskoordination", "การต้อนรับที่สนามบินและประสานงานการมาถึง", "空港でのお出迎えと到着の調整");
  E("Welcome drink on arrival", "Willkommensdrink bei Ankunft", "เครื่องดื่มต้อนรับเมื่อมาถึง", "ご到着時のウェルカムドリンク");
  E("Breakfast on both mornings", "Frühstück an beiden Morgen", "อาหารเช้าทั้งสองวัน", "両日の朝食");
  E("Two hour beverage package", "Zwei Stunden Getränkepaket", "แพ็กเกจเครื่องดื่มสองชั่วโมง", "2時間のドリンクパッケージ");
  E("Departure coordination within the wedding programme", "Abreisekoordination im Rahmen des Hochzeitsprogramms", "การประสานงานเดินทางกลับภายในกำหนดการงานแต่ง", "式次第内での出発の調整");
  E("Sunset Drinks & Wedding Dinner", "Sunset Drinks & Hochzeitsdinner", "ดื่มยามอาทิตย์อัสดงและงานเลี้ยงมงคลสมรส", "サンセットドリンク＆ウェディングディナー");

  /* ---- payment / notes ---- */
  E("No deposit is required. Once your arrangements are confirmed, you will receive an invoice with bank transfer or PayPal instructions. Payment is due within seven days. One person may settle the invoice for everyone travelling with them.", "Es ist keine Anzahlung nötig. Sobald eure Arrangements bestätigt sind, erhaltet ihr eine Rechnung mit Angaben zu Überweisung oder PayPal. Zahlbar innerhalb von sieben Tagen. Eine Person kann die Rechnung für alle Mitreisenden begleichen.", "ไม่ต้องวางมัดจำ เมื่อการจัดเตรียมของคุณได้รับการยืนยัน คุณจะได้รับใบแจ้งหนี้พร้อมช่องทางโอนธนาคารหรือ PayPal ชำระภายในเจ็ดวัน และหนึ่งท่านสามารถชำระแทนทุกคนที่เดินทางด้วยกันได้", "デポジットは不要です。手配確定後、銀行振込またはPayPalのご案内を記載した請求書をお送りします。お支払い期限は7日以内。ご一緒の皆さまの分を、お一人でまとめてご精算いただけます。");
  E("This is a registration request. Guest Relations will confirm your arrangements separately.", "Dies ist eine Registrierungsanfrage. Guest Relations bestätigt eure Arrangements separat.", "นี่คือคำขอลงทะเบียน ฝ่ายดูแลแขกจะยืนยันการจัดเตรียมของคุณแยกต่างหาก", "これは登録リクエストです。手配内容はゲストリレーションズが別途ご連絡のうえ確定します。");
  E("We confirm this information is accurate. We understand this registration is a request and that Guest Relations confirms all arrangements separately.", "Wir bestätigen, dass diese Angaben korrekt sind. Uns ist bewusst, dass diese Registrierung eine Anfrage ist und Guest Relations alle Arrangements separat bestätigt.", "เรายืนยันว่าข้อมูลนี้ถูกต้อง และเข้าใจว่าการลงทะเบียนนี้เป็นคำขอ โดยฝ่ายดูแลแขกจะยืนยันการจัดเตรียมทั้งหมดแยกต่างหาก", "この情報が正確であることを確認します。本登録はリクエストであり、すべての手配はゲストリレーションズが別途確定することを理解しています。");

  /* multi-line split-heading line pairs */
  E("Where you", "Wo ihr", "ที่ที่คุณ", "目覚める");
  E("wake up.", "aufwacht.", "จะตื่นนอน", "場所。");
  E("Where the celebration", "Wo gefeiert", "ที่ซึ่งงานฉลอง", "祝宴の");
  E("unfolds.", "wird.", "จะเกิดขึ้น", "舞台。");
  E("Six stops,", "Sechs Stationen,", "หกจุดหมาย", "六つの停車地、");
  E("The Story", "Die Geschichte", "เรื่องราวของเรา", "ふたりの物語");
  E("Where You Sleep", "Wo ihr schlaft", "ที่พักของคุณ", "お泊まりの場所");
  E("The Dress Guide", "Der Dress Guide", "คู่มือการแต่งกาย", "ドレスガイド");
  E("The Weekend, in Order", "Das Wochenende, der Reihe nach", "ลำดับวันงาน", "週末の流れ");
  E("How the days unfold.", "Wie die Tage sich entfalten.", "แต่ละวันจะเป็นอย่างไร", "日々のながれ");

  /* ---- editorial long-form (owner-approved localization, FER §3) ---- */
  E("Special Express No. 25, First Class Sleeper. Bangkok slips away at 20:25; the night runs north for 10 hours and 20 minutes, and the Mekong arrives with the morning at Nong Khai, the last quiet stretch before Vientiane.",
    "Special Express No. 25, First Class Sleeper. Bangkok gleitet um 20:25 davon; die Nacht zieht zehn Stunden und zwanzig Minuten nach Norden, und mit dem Morgen erscheint der Mekong bei Nong Khai — das letzte stille Stück vor Vientiane.",
    "รถด่วนพิเศษขบวนที่ 25 ตู้นอนชั้นหนึ่ง กรุงเทพฯ ค่อย ๆ เลือนหายไปตอน 20:25 ค่ำคืนพาเรามุ่งขึ้นเหนือสิบชั่วโมงยี่สิบนาที และแม่น้ำโขงก็มาพร้อมรุ่งเช้าที่หนองคาย ช่วงสุดท้ายอันเงียบสงบก่อนถึงเวียงจันทน์",
    "スペシャル・エクスプレス25号、ファーストクラス寝台。20時25分、バンコクが静かに遠ざかる。夜は10時間20分かけて北へ走り、朝とともにメコン川がノーンカーイに現れる——ビエンチャンへ続く、最後の静かな道のり。");
  E("Monks in saffron robes at first light, a quiet Buddhist ritual to open the wedding day with meaning.",
    "Mönche in safranfarbenen Roben im ersten Licht — ein stilles buddhistisches Ritual, das den Hochzeitstag mit Bedeutung eröffnet.",
    "พระสงฆ์ในจีวรสีทองยามแสงแรก พิธีทางพุทธอันเงียบงามที่เปิดวันแต่งงานอย่างมีความหมาย",
    "夜明けの光の中、袈裟をまとった僧侶たち。結婚の一日を意味深く始める、静かな仏教の儀式。");
  E("As the day softens: stillness, presence, and the vow made public in front of the people who matter most.",
    "Wenn der Tag weicher wird: Stille, Gegenwart, und das Versprechen — öffentlich, vor den Menschen, die am meisten bedeuten.",
    "เมื่อแสงของวันอ่อนโยนลง ความสงบ ความรู้สึกอยู่ตรงนั้น และคำสัญญาที่เอ่ยต่อหน้าคนที่สำคัญที่สุด",
    "日が和らぐころ——静けさと、その場に在ること。最も大切な人々の前で交わされる、誓いのことば。");
  E("Sunset drinks beside the pool, then dinner in the courtyard garden. Lao food, music and a long, unhurried evening together.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten. Laotisches Essen, Musik und ein langer, ruhiger Abend — gemeinsam.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์อัสดง แล้วต่อด้วยมื้อค่ำในสวนลานบ้าน อาหารลาว เสียงดนตรี และค่ำคืนที่งดงามร่วมกัน",
    "夕暮れ、プールサイドでの乾杯。続いて中庭でのディナー。ラオス料理と音楽とともに、穏やかな夜を分かち合います。");
  E("Souphattra Heritage Vientiane sits at the heart of our wedding stay: shared mornings, shared arrivals, and the rhythm of the weekend centred around one quiet place. Choose the stay that feels right for you.",
    "Das Souphattra Heritage Vientiane ist das Herz unseres Hochzeitsaufenthalts: gemeinsame Morgen, gemeinsame Ankünfte und der Rhythmus des Wochenendes um einen stillen Ort. Wählt den Aufenthalt, der sich für euch richtig anfühlt.",
    "สุพัตรา เฮอริเทจ เวียงจันทน์ คือหัวใจของการพักในงานแต่งของเรา เช้าที่แบ่งปันกัน การมาถึงพร้อมกัน และจังหวะของสุดสัปดาห์ที่หมุนรอบสถานที่อันเงียบสงบแห่งเดียว เลือกที่พักที่ใช่สำหรับคุณ",
    "スパッタラ・ヘリテージ・ビエンチャンは、この結婚式の滞在の中心。共に迎える朝、共にたどり着く時間、静かなひとつの場所を巡る週末のリズム。あなたに合う滞在をお選びください。");
  E("For rooms at Souphattra Heritage Vientiane, the amount shown is your total contribution per guest for the two-night wedding stay: the first night is your guest contribution; the second night is hosted by Haruthai & Suthep.",
    "Der angezeigte Betrag umfasst die Kosten, die ihr für den gesamten Hochzeitsaufenthalt von zwei Nächten selbst übernehmt. Die zweite Nacht übernehmen Haruthai & Suthep für euch.",
    "สำหรับห้องพักที่สุพัตรา เฮอริเทจ เวียงจันทน์ จำนวนที่แสดงคือส่วนร่วมทั้งหมดต่อท่านสำหรับการพักสองคืนของช่วงงานแต่ง คืนแรกคือส่วนร่วมของคุณ ส่วนคืนที่สองหฤทัยและสุเทพดูแลให้",
    "スパッタラ・ヘリテージの客室について、表示額は2泊のウェディングステイに対するお一人あたりのご負担の全額です。1泊目はゲストのご負担、2泊目はハルタイ＆ステープがおもてなしいたします。")
  E("The shared days in Bangkok before travelling on to Laos.",
    "Die gemeinsamen Tage in Bangkok, bevor es weiter nach Laos geht.",
    "วันเวลาที่ใช้ร่วมกันในกรุงเทพฯ ก่อนเดินทางต่อไปยังลาว",
    "ラオスへ発つ前の、バンコクで共に過ごす日々。");
  E("A quiet Buddhist ritual to open the wedding day at first light. Monks walk in procession; rice is offered; nothing is hurried.",
    "Ein stilles buddhistisches Ritual zur Eröffnung des Hochzeitstags im ersten Licht. Mönche ziehen in Prozession; Reis wird gereicht; nichts wird eilig.",
    "พิธีทางพุทธอันเงียบงามเปิดวันแต่งงานยามแสงแรก พระสงฆ์เดินบิณฑบาต ถวายข้าว ไม่มีสิ่งใดเร่งรีบ",
    "夜明けの光とともに結婚の一日を開く、静かな仏教の儀式。僧侶の列が進み、米が捧げられ、何も急がない。");
  E("The vows, in front of everyone who matters.",
    "Das Versprechen — vor allen, die zählen.",
    "คำสัญญา ต่อหน้าทุกคนที่สำคัญ",
    "大切な人みんなの前で交わす、誓い。");
  E("Sunset drinks beside the pool, then dinner in the courtyard garden.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์อัสดง แล้วต่อด้วยมื้อค่ำในสวนลานบ้าน",
    "夕暮れ、プールサイドでの乾杯。続いて中庭でのディナー。")
  E("The shared Pre-Wedding home in Bangkok — Personal pickup by Haruthai on 21 FEB 2027.",
    "Das gemeinsame Pre-Wedding-Zuhause in Bangkok — persönliche Abholung durch Haruthai am 21 FEB 2027.",
    "บ้านพักก่อนวันงานที่ใช้ร่วมกันในกรุงเทพฯ — หรุทัยไปรับด้วยตัวเองวันที่ 21 ก.พ. 2027",
    "バンコクで共に過ごすプレウェディングの家——2027年2月21日、ハルタイが直接お迎えに上がります。");
  E("Personal pickup by Haruthai", "Persönliche Abholung durch Haruthai", "หรุทัยไปรับด้วยตัวเอง", "ハルタイが直接お迎え");
  E("Bangkok arrival", "Ankunft in Bangkok", "ถึงกรุงเทพฯ", "バンコク到着");
  E("Arrive Nong Khai", "Ankunft Nong Khai", "ถึงหนองคาย", "ノーンカーイ到着");
  E("Nong Khai Railway Station", "Bahnhof Nong Khai", "สถานีรถไฟหนองคาย", "ノーンカーイ駅");
  E("The Wedding · Main Event", "Die Hochzeit · Hauptereignis", "งานแต่งงาน · งานหลัก", "ウェディング・メインイベント");
  E("Your wedding stay · Vientiane", "Euer Hochzeitsaufenthalt · Vientiane", "ที่พักช่วงงานแต่ง · เวียงจันทน์", "挙式期間のご滞在・ビエンチャン");
  E("First night · your contribution — second night · hosted", "Erste Nacht · eure Kosten — zweite Nacht · für euch übernommen", "คืนแรก · ส่วนร่วมของคุณ — คืนที่สอง · เจ้าภาพดูแล", "1泊目・ご負担 — 2泊目・ご招待");
  E("Choose under My Stay", "Unter „Mein Aufenthalt“ wählen", "เลือกได้ที่ ที่พักของฉัน", "「宿泊」からお選びください");
  E("Choose your Bangkok stay in My Journey", "Euren Bangkok-Aufenthalt unter „Meine Reise“ wählen", "เลือกที่พักกรุงเทพฯ ได้ที่ เส้นทางของฉัน", "「旅のしおり」でバンコクの滞在をお選びください");
  E("Choose in My Journey", "Unter „Meine Reise“ wählen", "เลือกได้ที่ เส้นทางของฉัน", "「旅のしおり」でお選びください");
  E("Your journey, in order", "Eure Reise, der Reihe nach", "การเดินทางของคุณ ตามลำดับ", "旅の行程（日付順）");
  E("Follows your onward itinerary", "Folgt eurer Weiterreise", "เป็นไปตามแผนการเดินทางต่อของคุณ", "その後のご旅程に合わせます");
  E("Arranged independently", "Eigenständig organisiert", "จัดการด้วยตัวเอง", "ご自身で手配");
  E("Guest Relations support requested", "Unterstützung durch Guest Relations angefragt", "ขอความช่วยเหลือจากฝ่ายดูแลแขกแล้ว", "ゲストリレーションズに相談済み");
  E("Return to Bangkok with us", "Mit uns zurück nach Bangkok", "กลับกรุงเทพฯ พร้อมเรา", "私たちと一緒にバンコクへ");
  E("HOSTED", "ÜBERNOMMEN", "เจ้าภาพดูแล", "ご招待");
  E("ARRANGED", "ARRANGIERT", "จัดเตรียมแล้ว", "手配済み");
  E("ARRANGED WITH GUEST RELATIONS", "MIT GUEST RELATIONS ARRANGIERT", "จัดเตรียมกับฝ่ายดูแลแขกแล้ว", "ゲストリレーションズが手配");
  E("YOUR CHOICE", "EURE WAHL", "คุณเลือกได้", "ご選択ください");
  E("TO FINALIZE WITH GUEST RELATIONS", "MIT GUEST RELATIONS ABZUSTIMMEN", "รอสรุปกับฝ่ายดูแลแขก", "ゲストリレーションズと最終調整");
  E("Coordinated transfer after your train arrival — Guest Relations confirms the exact pickup details personally.",
    "Koordinierter Transfer nach eurer Zugankunft — Guest Relations bestätigt die genauen Abholdetails persönlich.",
    "รถรับส่งที่จัดเตรียมไว้หลังรถไฟถึง ฝ่ายดูแลแขกจะยืนยันรายละเอียดการรับด้วยตนเอง",
    "列車到着後の送迎を手配済み——お迎えの詳細はゲストリレーションズが直接ご案内します。");
  E("Between Wattay International Airport / Vientiane railway station and Souphattra Heritage on arrival day. Guest Relations confirms your pickup time personally.",
    "Zwischen Wattay International Airport / Bahnhof Vientiane und dem Souphattra Heritage am Ankunftstag. Guest Relations bestätigt eure Abholzeit persönlich.",
    "ระหว่างสนามบินวัตไต / สถานีรถไฟเวียงจันทน์ กับสุพัตรา เฮอริเทจ ในวันเดินทางมาถึง ฝ่ายดูแลแขกจะยืนยันเวลารับด้วยตนเอง",
    "ご到着日に、ワッタイ国際空港／ビエンチャン駅とスパッタラ・ヘリテージの間を送迎。お迎え時刻はゲストリレーションズがご案内します。");
  E("Haruthai & Suthep continue to Kunming and Lijiang after the wedding. If you would like to join part of the onward journey, we will prepare it with you. You may return to Bangkok with us, continue elsewhere, or make your own plans — every answer is a complete answer.",
    "Haruthai & Suthep reisen nach der Hochzeit weiter nach Kunming und Lijiang. Wenn ihr einen Teil der Weiterreise mitgehen möchtet, bereiten wir sie mit euch vor. Ihr könnt mit uns nach Bangkok zurückkehren, anderswo weiterreisen oder eigene Pläne machen — jede Antwort ist eine vollständige Antwort.",
    "หลังงานแต่ง หรุทัยและสุเทพเดินทางต่อไปคุนหมิงและลี่เจียง หากคุณอยากร่วมเส้นทางส่วนใดส่วนหนึ่ง เราจะเตรียมให้พร้อมกับคุณ จะกลับกรุงเทพฯ กับเรา เดินทางต่อที่อื่น หรือวางแผนเอง ทุกคำตอบคือคำตอบที่สมบูรณ์",
    "挙式後、ハルタイとステープは昆明と麗江へ旅を続けます。行程の一部にご一緒くださるなら、共に準備いたします。私たちとバンコクへ戻るのも、別の地へ進むのも、ご自身の計画も——どの答えも、完全な答えです。");
  E("The wedding day opens with the morning ritual at Souphattra Heritage Vientiane: monks in procession, rice offered, nothing hurried.",
    "Der Hochzeitstag beginnt mit dem Morgenritual im Souphattra Heritage Vientiane: Mönche in Prozession, gereichter Reis, nichts eilig.",
    "วันแต่งงานเริ่มด้วยพิธียามเช้าที่สุพัตรา เฮอริเทจ เวียงจันทน์ พระสงฆ์เดินบิณฑบาต ถวายข้าว อย่างไม่เร่งรีบ",
    "結婚の一日は、スパッタラ・ヘリテージでの朝の儀式から。僧侶の列、捧げられる米、急がない時間。");
  E("Warm days and cooler mornings by the river. Bring a light layer for the dawn alms giving.",
    "Warme Tage und kühlere Morgen am Fluss. Bringt eine leichte Schicht für das Morgenritual im Morgengrauen mit.",
    "กลางวันอบอุ่น เช้าริมแม่น้ำเย็นสบาย เตรียมเสื้อคลุมบาง ๆ สำหรับพิธีตักบาตรยามรุ่งสาง",
    "昼は暖かく、川辺の朝は涼しめ。夜明けの托鉢には薄手の羽織りをご用意ください。");
  E("dry season", "Trockenzeit", "ฤดูแล้ง", "乾季");
  E("Your contacts", "Eure Ansprechpartner", "ช่องทางติดต่อ", "お問い合わせ先");
  E("Getting there", "Anreise", "การเดินทางไป", "アクセス");
  E("Weather in late February", "Wetter Ende Februar", "อากาศปลายเดือนกุมภาพันธ์", "2月下旬の気候");
  E("Visa & currency", "Visum & Währung", "วีซ่าและสกุลเงิน", "ビザと通貨");
  E("Extend your journey", "Verlängert eure Reise", "ต่อการเดินทางของคุณ", "旅を延ばして");

  /* ---- FULL guest-area coverage (001 final correction §B) ---- */
  E("Your journey", "Eure Reise", "การเดินทางของคุณ", "旅の概要");
  E("Your stay", "Euer Aufenthalt", "ที่พักของคุณ", "ご滞在");
  E("Your invitation", "Eure Einladung", "บัตรเชิญของคุณ", "ご招待状");
  E("Open your invitation", "Öffnet eure Einladung", "เปิดบัตรเชิญของคุณ", "招待状を開く");
  E("Visit the wedding website", "Zur Hochzeitswebseite", "ไปที่เว็บไซต์งานแต่ง", "ウェディングサイトへ");
  E("The wedding days", "Die Hochzeitstage", "วันงานแต่งงาน", "婚礼の日々");
  E("Personal details", "Persönliche Angaben", "ข้อมูลส่วนตัว", "個人情報");
  E("Contact, dietary needs and the small preferences that shape your stay", "Kontakt, Ernährung und die kleinen Vorlieben, die euren Aufenthalt prägen", "ช่องทางติดต่อ อาหาร และความชอบเล็ก ๆ ที่ทำให้การพักของคุณพิเศษ", "連絡先、お食事のご希望、滞在を彩る小さなお好み");
  E("Your Journey, at a glance", "Eure Reise auf einen Blick", "การเดินทางของคุณโดยสรุป", "旅のひと目でわかるまとめ");
  E("Review & send", "Prüfen & senden", "ตรวจทานและส่ง", "確認して送信");
  E("Registration received", "Registrierung eingegangen", "ได้รับการลงทะเบียนแล้ว", "登録を受け付けました");
  E("Guest Relations is preparing your journey", "Guest Relations bereitet eure Reise vor", "ฝ่ายดูแลแขกกำลังเตรียมการเดินทางของคุณ", "ゲストリレーションズが旅を準備中です");
  E("One quiet look over everything before it reaches Guest Relations", "Ein ruhiger Blick über alles, bevor es Guest Relations erreicht", "ตรวจดูทุกอย่างอย่างใจเย็นก่อนส่งถึงฝ่ายดูแลแขก", "送信前に、すべてを静かにご確認ください");
  E("Next step", "Nächster Schritt", "ขั้นตอนถัดไป", "次のステップ");
  E("Status", "Status", "สถานะ", "ステータス");
  E("Choose where you wake up: your room at Souphattra Heritage Vientiane.", "Wählt, wo ihr aufwacht: euer Zimmer im Souphattra Heritage Vientiane.", "เลือกที่ที่คุณจะตื่นนอน ห้องของคุณที่สุพัตรา เฮอริเทจ เวียงจันทน์", "目覚める場所を選んでください——スパッタラ・ヘリテージの客室を。");
  E("A few personal details are still open so the table can be set around you.", "Ein paar persönliche Angaben fehlen noch, damit der Tisch um euch herum gedeckt werden kann.", "ยังขาดข้อมูลส่วนตัวเล็กน้อย เพื่อให้เราจัดเตรียมทุกอย่างรอบตัวคุณได้", "あとわずかの情報で、あなたに合わせた準備が整います。");
  E("Everything is in place. Review your journey and send it to Guest Relations.", "Alles ist bereit. Prüft eure Reise und sendet sie an Khun Ket und Khun Paddy.", "ทุกอย่างพร้อมแล้ว ตรวจทานการเดินทางของคุณและส่งให้ฝ่ายดูแลแขก", "すべて整いました。旅程を確認し、ゲストリレーションズへお送りください。");
  E("Your registration is with Guest Relations. Khun Ket and Khun Paddy personally review every detail. Your private area stays open while they prepare your arrangements; no action is needed from you.",
    "Khun Ket und Khun Paddy prüfen eure Angaben persönlich und bereiten die weiteren Arrangements für euch vor. Euer Gästebereich bleibt währenddessen geöffnet — ihr müsst im Moment nichts weiter tun.",
    "การลงทะเบียนของคุณอยู่กับฝ่ายดูแลแขกแล้ว คุณเกตุและคุณแพดดี้ตรวจทุกรายละเอียดด้วยตนเอง พื้นที่ส่วนตัวของคุณยังเปิดอยู่ระหว่างการจัดเตรียม โดยคุณไม่ต้องทำอะไรเพิ่ม",
    "ご登録はゲストリレーションズが承りました。クン・ケットとクン・パディがすべてを直接確認します。準備の間もプライベートエリアは開いたまま——お客さまのご対応は不要です。");
  E("Continue your journey", "Eure Reise fortsetzen", "เดินทางต่อ", "旅をつづける");
  E("View your journey", "Eure Reise ansehen", "ดูการเดินทางของคุณ", "旅程を見る");
  E("The road to the wedding: Bangkok · the overnight train · Nong Khai · Vientiane · the wedding days.",
    "Der Weg zur Hochzeit: Bangkok · der Nachtzug · Nong Khai · Vientiane · die Hochzeitstage.",
    "เส้นทางสู่งานแต่ง กรุงเทพฯ · รถไฟตู้นอน · หนองคาย · เวียงจันทน์ · วันงานแต่งงาน",
    "結婚式への道：バンコク・夜行列車・ノーンカーイ・ビエンチャン・婚礼の日々。");
  E("Journey to Vientiane · one decision, two ways", "Reise nach Vientiane · eine Entscheidung, zwei Wege", "เดินทางสู่เวียงจันทน์ · หนึ่งการตัดสินใจ สองเส้นทาง", "ビエンチャンへの旅・ひとつの選択、ふたつの道");
  E("Before the wedding", "Vor der Hochzeit", "ก่อนวันงาน", "挙式前");
  E("I’m joining", "Ich bin dabei", "เข้าร่วม", "参加します");
  E("Your own way", "Euer eigener Weg", "แบบของคุณเอง", "ご自身のスタイルで");
  E("We will do our best to arrange your preferred berth. Final allocation depends on railway availability.",
    "Wir bemühen uns um euren Wunschplatz. Die endgültige Zuteilung hängt von der Verfügbarkeit der Bahn ab.",
    "เราจะพยายามจัดที่นอนตามที่คุณต้องการ การจัดสรรขึ้นอยู่กับที่ว่างของการรถไฟ",
    "ご希望の寝台をできる限り手配します。最終的な割り当ては鉄道の空席状況によります。");
  E("Anything that matters for the train journey (mobility, luggage, comfort)",
    "Alles, was für die Zugfahrt wichtig ist (Mobilität, Gepäck, Komfort)",
    "สิ่งที่สำคัญสำหรับการเดินทางด้วยรถไฟ (การเคลื่อนไหว สัมภาระ ความสะดวก)",
    "列車の旅で大切なこと（移動・荷物・快適さ）");
  E("Lower berth", "Unteres Bett", "เตียงล่าง", "下段");
  E("Upper berth", "Oberes Bett", "เตียงบน", "上段");
  E("No preference", "Keine Präferenz", "ไม่ระบุ", "指定なし");
  E("The night train, arranged around you", "Der Nachtzug, um euch herum arrangiert", "รถไฟตู้นอนที่จัดเพื่อคุณ", "あなたに合わせた夜行列車");
  E("Choose your service — everything else is arranged for you. Guest Relations confirms every journey personally; private cars are charged per vehicle, never per guest.",
    "Wählt euren Service — alles andere wird für euch arrangiert. Guest Relations bestätigt jede Fahrt persönlich; Privatwagen werden pro Fahrzeug berechnet, nie pro Gast.",
    "เลือกบริการของคุณ ส่วนที่เหลือเราจัดการให้ ฝ่ายดูแลแขกยืนยันทุกการเดินทางด้วยตนเอง รถส่วนตัวคิดต่อคัน ไม่ใช่ต่อท่าน",
    "サービスをお選びください。あとはすべてお任せを。各送迎はゲストリレーションズが直接確定します。専用車は1台単位のご請求で、人数分ではありません。");
  E("Your arrival and departure are coordinated personally by Guest Relations — nothing to organise here. If a detail is ever needed, they will simply ask you.",
    "Eure An- und Abreise koordiniert Guest Relations persönlich — hier gibt es nichts zu organisieren. Falls je ein Detail nötig ist, fragen sie einfach nach.",
    "การมาถึงและการเดินทางกลับของคุณ ฝ่ายดูแลแขกประสานงานให้ด้วยตนเอง ไม่มีอะไรต้องจัดการที่นี่ หากต้องการรายละเอียดเพิ่ม เราจะถามคุณเอง",
    "ご到着とご出発はゲストリレーションズが直接調整します。こちらで手続きは不要。必要なことがあれば、こちらからお伺いします。");
  E("You arrive with the Night Train at Nong Khai Railway Station — the onward journey to Souphattra Heritage is shown first.",
    "Ihr kommt mit dem Nachtzug am Bahnhof Nong Khai an — die Weiterfahrt zum Souphattra Heritage steht an erster Stelle.",
    "คุณมาถึงสถานีหนองคายด้วยรถไฟตู้นอน การเดินทางต่อไปสุพัตรา เฮอริเทจ แสดงเป็นอันดับแรก",
    "夜行列車でノーンカーイ駅に到着します。スパッタラ・ヘリテージへの移動を最初にご案内します。");
  E("Pickup and transfers are requests — statuses move from REQUESTED to UNDER REVIEW to CONFIRMED as Guest Relations coordinates them.",
    "Abholung und Transfers sind Anfragen — der Status wandert von ANGEFRAGT über WIRD GERADE GEPRÜFT zu BESTÄTIGT, während Khun Ket und Khun Paddy alles persönlich koordinieren.",
    "การรับส่งเป็นคำขอ สถานะจะเปลี่ยนจาก ส่งคำขอแล้ว เป็น กำลังตรวจสอบ และ ยืนยันแล้ว ตามที่ฝ่ายดูแลแขกประสานงาน",
    "送迎はリクエスト制です。ゲストリレーションズの調整により、ステータスはリクエスト済み→確認中→確定と進みます。");
  E("Departure follows your actual onward itinerary — until then it stays with Guest Relations.",
    "Die Abreise folgt eurer tatsächlichen Weiterreise — bis dahin liegt sie bei Guest Relations.",
    "การเดินทางกลับเป็นไปตามแผนต่อของคุณ ระหว่างนี้ฝ่ายดูแลแขกดูแลให้",
    "ご出発はその後のご旅程に合わせます。それまではゲストリレーションズにお任せください。");
  E("Your Bangkok stay", "Euer Aufenthalt in Bangkok", "ที่พักของคุณในกรุงเทพฯ", "バンコクでのご滞在");
  E("ARRANGED WITH GUEST RELATIONS · pickup follows your train arrival", "MIT GUEST RELATIONS ARRANGIERT · Abholung folgt eurer Zugankunft", "จัดเตรียมกับฝ่ายดูแลแขกแล้ว · รถรับตามเวลาที่รถไฟถึง", "ゲストリレーションズが手配・列車到着後にお迎え");
  E("ARRANGED WITH GUEST RELATIONS · your room in the penthouse follows personally", "MIT GUEST RELATIONS ARRANGIERT · euer Zimmer im Penthouse folgt persönlich", "จัดเตรียมกับฝ่ายดูแลแขกแล้ว · ห้องของคุณในเพนต์เฮาส์จะแจ้งเป็นการส่วนตัว", "ゲストリレーションズが手配・ペントハウスのお部屋は個別にご案内");
  E("REQUESTED · Guest Relations confirms every detail with you personally", "ANGEFRAGT · Guest Relations bestätigt jedes Detail persönlich mit euch", "ส่งคำขอแล้ว · ฝ่ายดูแลแขกจะยืนยันทุกรายละเอียดกับคุณ", "リクエスト済み・詳細はゲストリレーションズが直接ご確認");
  E("REQUESTED · Guest Relations confirms your seats personally", "ANGEFRAGT · Guest Relations bestätigt eure Plätze persönlich", "ส่งคำขอแล้ว · ฝ่ายดูแลแขกจะยืนยันที่นั่งของคุณ", "リクエスト済み・お席はゲストリレーションズが確定します");
  E("REQUESTED · Guest Relations confirms every detail personally", "ANGEFRAGT · Guest Relations bestätigt jedes Detail persönlich", "ส่งคำขอแล้ว · ฝ่ายดูแลแขกยืนยันทุกรายละเอียด", "リクエスト済み・詳細はゲストリレーションズが確定");
  E("Requested · Guest Relations will confirm", "Angefragt · Guest Relations bestätigt", "ส่งคำขอแล้ว · ฝ่ายดูแลแขกจะยืนยัน", "リクエスト済み・ゲストリレーションズが確定");
  E("First night · guest contribution", "Erste Nacht · eure Kosten", "คืนแรก · ส่วนร่วมของแขก", "1泊目・ゲストのご負担");
  E("Second night · hosted by", "Zweite Nacht · übernommen von", "คืนที่สอง · ของขวัญจาก", "2泊目・ご招待——");
  E("Breakfast included", "Frühstück inklusive", "รวมอาหารเช้า", "朝食付き");
  E("Complimentary stay", "Kostenfreier Aufenthalt", "เข้าพักโดยไม่มีค่าใช้จ่าย", "無料でのご滞在");
  E("Limited availability", "Begrenzt verfügbar", "จำนวนจำกัด", "数に限りあり");
  E("Personally coordinated by Guest Relations", "Persönlich koordiniert von Guest Relations", "ประสานงานโดยฝ่ายดูแลแขก", "ゲストリレーションズが直接調整");
  E("Complimentary · limited availability", "Kostenfrei · begrenzt verfügbar", "ไม่มีค่าใช้จ่าย · จำนวนจำกัด", "無料・数に限りあり");
  E("Arrange a spa or massage experience?", "Ein Spa- oder Massageerlebnis arrangieren?", "ต้องการสปาหรือนวดไหม?", "スパやマッサージをご希望ですか？");
  E("Yes, please", "Ja, gern", "ค่ะ/ครับ", "はい、お願いします");
  E("Treatment", "Anwendung", "ทรีตเมนต์", "トリートメント");
  E("Preferred day", "Wunschtag", "วันที่ต้องการ", "ご希望日");
  E("Massage", "Massage", "นวด", "マッサージ");
  E("Spa treatment", "Spa-Anwendung", "สปาทรีตเมนต์", "スパトリートメント");
  E("No preference · please recommend", "Keine Präferenz · bitte empfehlen", "ไม่ระบุ · ช่วยแนะนำ", "指定なし・おすすめで");
  E("No restrictions", "Keine Einschränkungen", "ไม่มีข้อจำกัด", "制限なし");
  E("Vegetarian", "Vegetarisch", "มังสวิรัติ", "ベジタリアン");
  E("Vegan", "Vegan", "วีแกน", "ヴィーガン");
  E("Pescatarian", "Pescetarisch", "เพสคาทาเรียน", "ペスカタリアン");
  E("Gluten free", "Glutenfrei", "ปลอดกลูเตน", "グルテンフリー");
  E("Lactose free", "Laktosefrei", "ปลอดแล็กโทส", "乳糖不使用");
  E("Other", "Anderes", "อื่น ๆ", "その他");
  E("We confirm this information is accurate. We understand this registration is a request and that Guest Relations confirms all arrangements separately.",
    "Wir bestätigen, dass diese Angaben korrekt sind. Uns ist bewusst, dass diese Registrierung eine Anfrage ist und Guest Relations alle Arrangements separat bestätigt.",
    "เรายืนยันว่าข้อมูลถูกต้อง และเข้าใจว่านี่คือคำขอลงทะเบียน โดยฝ่ายดูแลแขกจะยืนยันการจัดเตรียมทั้งหมดแยกต่างหาก",
    "この情報が正確であることを確認します。本登録はリクエストであり、手配はゲストリレーションズが別途確定することを理解しています。");
  E("Your Guests", "Eure Gäste", "แขกของคุณ", "ゲストの皆さま");
  E("Members", "Mitglieder", "สมาชิก", "メンバー");
  E("Lead guest", "Hauptgast", "แขกหลัก", "代表ゲスト");
  E("Overnight Train", "Nachtzug", "รถไฟตู้นอน", "夜行列車");
  E("Your Contribution", "Eure Kosten", "ส่วนร่วมของคุณ", "ご負担分");
  E("Your Stay", "Euer Aufenthalt", "ที่พักของคุณ", "ご滞在");
  E("Your Transfers", "Eure Transfers", "การรับส่งของคุณ", "送迎");
  E("Your Bangkok Stay", "Euer Bangkok-Aufenthalt", "ที่พักในกรุงเทพฯ ของคุณ", "バンコクでのご滞在");
  E("Arrival & Departure", "Ankunft & Abreise", "การมาถึงและเดินทางกลับ", "到着と出発");
  E("Each of You", "Jede und jeder von euch", "ทุกคนในกลุ่มของคุณ", "お一人おひとり");
  E("Dates", "Daten", "วันที่", "日程");
  E("Requested", "Angefragt", "ส่งคำขอแล้ว", "リクエスト内容");
  E("Arrival", "Ankunft", "การมาถึง", "ご到着");
  E("Departure", "Abreise", "การเดินทางกลับ", "ご出発");
  E("Joined", "Dabei", "เข้าร่วม", "参加");
  E("Joining", "Dabei", "เข้าร่วม", "参加");
  E("Not joined", "Nicht dabei", "ไม่เข้าร่วม", "不参加");
  E("Seats requested", "Angefragte Plätze", "ที่นั่งที่ขอ", "リクエスト席数");
  E("Onward transfer", "Weitertransfer", "การเดินทางต่อ", "その後の送迎");
  E("Dress code understood", "Dresscode verstanden", "เข้าใจการแต่งกายแล้ว", "ドレスコード確認済み");
  E("Dress code not yet confirmed — please confirm under The Wedding", "Dresscode noch nicht bestätigt — bitte unter „Die Hochzeit“ bestätigen", "ยังไม่ได้ยืนยันการแต่งกาย โปรดยืนยันที่ งานแต่งงาน", "ドレスコード未確認——「結婚式」でご確認ください");
  E("Allergy · None reported", "Allergie · keine gemeldet", "ภูมิแพ้ · ไม่มีรายงาน", "アレルギー・報告なし");
  E("Allergy · please add the detail for the kitchens under My Details", "Allergie · bitte das Detail für die Küchen unter „Meine Angaben“ ergänzen", "ภูมิแพ้ · โปรดเพิ่มรายละเอียดสำหรับครัวได้ที่ ข้อมูลของฉัน", "アレルギー・厨房のために「ゲスト情報」で詳細をご記入ください");
  E("Please confirm the information is accurate first.", "Bitte bestätigt zuerst, dass die Angaben korrekt sind.", "โปรดยืนยันความถูกต้องของข้อมูลก่อน", "まず情報が正確であることをご確認ください。");
  E("Total", "Gesamt", "รวม", "合計");
  E("Second night", "Zweite Nacht", "คืนที่สอง", "2泊目");
  E("Complimentary · coordinated by Guest Relations", "Kostenfrei · koordiniert von Guest Relations", "ไม่มีค่าใช้จ่าย · ฝ่ายดูแลแขกประสานงาน", "無料・ゲストリレーションズが調整");
  E("Note", "Notiz", "หมายเหตุ", "メモ");
  E("Hosted", "Übernommen", "เจ้าภาพดูแล", "ご招待");
  E("Bangkok stay", "Bangkok-Aufenthalt", "ที่พักกรุงเทพฯ", "バンコク滞在");
  E("Train", "Zug", "รถไฟ", "列車");
  E("Transfers", "Transfers", "การรับส่ง", "送迎");
  E("Post Wedding Journey", "Reise nach der Hochzeit", "การเดินทางหลังงานแต่ง", "ウェディング後の旅");
  E("From here, everything is in our hands. Khun Ket and Khun Paddy review your travel information, confirm your accommodation, coordinate your transfers and prepare your personal journey. Your private area stays open the whole time; no action is needed from you.",
    "Khun Ket und Khun Paddy kümmern sich persönlich um die weiteren Details: eure Reisedaten, eure Unterkunft, eure Transfers und eure persönliche Reise. Euer Gästebereich bleibt die ganze Zeit geöffnet — ihr müsst im Moment nichts weiter tun.",
    "จากนี้ไปทุกอย่างอยู่ในมือเรา คุณเกตุและคุณแพดดี้ตรวจข้อมูลการเดินทาง ยืนยันที่พัก ประสานการรับส่ง และเตรียมการเดินทางส่วนตัวของคุณ พื้นที่ส่วนตัวเปิดอยู่ตลอด คุณไม่ต้องทำอะไรเพิ่ม",
    "ここから先はすべてお任せください。クン・ケットとクン・パディが旅の情報を確認し、宿泊を確定し、送迎を調整し、あなたの旅を整えます。プライベートエリアは常に開いたまま——ご対応は不要です。");
  E("We’re taking care of", "Darum kümmern wir uns", "เราดูแลให้ทั้งหมดนี้", "私たちが承ります");
  E("Your selections are now with Guest Relations. Nothing is booked until Khun Ket and Khun Paddy confirm your arrangements with you personally.",
    "Eure Angaben sind bei Khun Ket und Khun Paddy eingegangen. Sie kümmern sich persönlich um die weiteren Details. Noch ist nichts gebucht, bis sie die Arrangements persönlich mit euch bestätigt haben.",
    "สิ่งที่คุณเลือกอยู่กับฝ่ายดูแลแขกแล้ว จะยังไม่มีการจองใดจนกว่าคุณเกตุและคุณแพดดี้จะยืนยันการเตรียมการกับคุณเป็นการส่วนตัว",
    "ご選択の内容は、いまゲストリレーションズのもとにあります。クン・ケットとクン・パディがご本人と直接ご確認するまで、何も確定・予約はされません。")

  /* ---- public website full coverage ---- */
  E("Sunday, 28 February 2027 · Vientiane, Laos", "Sonntag, 28. Februar 2027 · Vientiane, Laos", "วันอาทิตย์ที่ 28 กุมภาพันธ์ 2027 · เวียงจันทน์ ลาว", "2027年2月28日（日）・ラオス、ビエンチャン");
  E("Sunday, 28 February 2027", "Sonntag, 28. Februar 2027", "วันอาทิตย์ที่ 28 กุมภาพันธ์ 2027", "2027年2月28日（日）");
  E("Vientiane · on the banks of the Mekong", "Vientiane · am Ufer des Mekong", "เวียงจันทน์ · ริมฝั่งแม่น้ำโขง", "ビエンチャン・メコン川のほとり");
  E("Your stay", "Euer Aufenthalt", "ที่พักของคุณ", "ご滞在");
  E("At first light", "Im ersten Licht", "ยามแสงแรก", "夜明けの光に");
  E("The vow", "Das Versprechen", "คำสัญญา", "誓い");
  E("The dinner", "Das Dinner", "งานเลี้ยง", "ディナー");
  E("Take a look", "Schaut hinein", "ลองชมดู", "見てみる");
  E("The morning", "Der Morgen", "ยามเช้า", "朝のひととき");
  E("The ceremony", "Die Zeremonie", "พิธี", "セレモニー");
  E("The evening", "Der Abend", "ยามเย็น", "夜のひととき");
  E("Souphattra Heritage Vientiane", "Souphattra Heritage Vientiane", "สุพัตรา เฮอริเทจ เวียงจันทน์", "スパッタラ・ヘリテージ・ビエンチャン");
  E("The heart of the wedding stay: one quiet courtyard, shared mornings, the whole rhythm of the weekend. You choose the stay that feels right for you.",
    "Das Herz des Hochzeitsaufenthalts: ein stiller Innenhof, gemeinsame Morgen, der ganze Rhythmus des Wochenendes. Ihr wählt den Aufenthalt, der sich richtig anfühlt.",
    "หัวใจของการพักช่วงงานแต่ง ลานบ้านอันเงียบสงบ เช้าที่แบ่งปันกัน และจังหวะทั้งหมดของสุดสัปดาห์ คุณเลือกที่พักที่ใช่สำหรับคุณ",
    "結婚式の滞在の中心——静かな中庭、共に迎える朝、週末のリズムのすべて。心地よい滞在をお選びください。");
  E("The courtyard settles into quiet in the late afternoon, framed by heritage architecture and the garden.",
    "Am späten Nachmittag wird der Innenhof still, gerahmt von Heritage-Architektur und dem Garten.",
    "ยามบ่ายแก่ ลานบ้านค่อย ๆ สงบลง โอบล้อมด้วยสถาปัตยกรรมมรดกและสวน",
    "午後遅く、中庭は静けさに包まれる。ヘリテージ建築と庭に囲まれて。");
  E("Sunset drinks beside the pool, then dinner in the courtyard garden. Lao food and a long, quiet evening.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten. Laotisches Essen und ein langer, ruhiger Abend.",
    "จิบเครื่องดื่มริมสระยามเย็น แล้วต่อด้วยมื้อค่ำในสวน อาหารลาวและค่ำคืนอันสงบงดงาม",
    "夕暮れのプールサイドで乾杯し、中庭でディナーを。ラオス料理とともに、穏やかな夜を。")
  E("One complete glance at the weekend, from the moment you land to the last slow goodbye. A table is always set. The key moments of the wedding journey are arranged for you, with Guest Relations coordinating the transfers connected to your plans.",
    "Das ganze Wochenende auf einen Blick — von der Landung bis zum letzten langsamen Abschied. Ein Tisch ist immer gedeckt. Die Schlüsselmomente der Hochzeitsreise sind für euch arrangiert; Guest Relations koordiniert die Transfers zu euren Plänen.",
    "สุดสัปดาห์ทั้งหมดในหนึ่งสายตา ตั้งแต่วินาทีที่คุณลงเครื่องจนถึงคำอำลาช้า ๆ ครั้งสุดท้าย โต๊ะอาหารพร้อมเสมอ ช่วงเวลาสำคัญของการเดินทางถูกจัดเตรียมไว้ให้ โดยฝ่ายดูแลแขกประสานการรับส่งตามแผนของคุณ",
    "着陸の瞬間から最後のゆっくりとした別れまで、週末のすべてをひと目で。食卓はいつも整っています。旅の要となる瞬間はすべて手配済み——送迎はゲストリレーションズがご予定に合わせて調整します。");
  E("the key moments are arranged for you", "die Schlüsselmomente sind für euch arrangiert", "ช่วงเวลาสำคัญถูกจัดเตรียมไว้ให้คุณ", "大切な瞬間はすべて手配済み");
  E("full timings follow in your Guest Area", "die genauen Zeiten folgen in eurem Gästebereich", "เวลาโดยละเอียดจะแจ้งในส่วนสำหรับแขก", "詳しい時間はゲストエリアでご案内");
  E("Only your private pickup times and meeting points arrive later in", "Nur eure privaten Abholzeiten und Treffpunkte folgen später in", "เฉพาะเวลารับส่วนตัวและจุดนัดพบจะแจ้งภายหลังใน", "お迎え時刻と集合場所のみ、後ほどこちらでご案内：");
  E("your Guest Area", "eurem Gästebereich", "ส่วนสำหรับแขกของคุณ", "ゲストエリア");
  E("Overnight Sleeper Train", "Nachtzug mit Schlafwagen", "รถไฟตู้นอน", "夜行寝台列車");
  E("Friday", "Freitag", "วันศุกร์", "金曜日");
  E("Saturday", "Samstag", "วันเสาร์", "土曜日");
  E("Sunday", "Sonntag", "วันอาทิตย์", "日曜日");
  E("Monday", "Montag", "วันจันทร์", "月曜日");
  E("26 February 2027", "26. Februar 2027", "26 กุมภาพันธ์ 2027", "2027年2月26日");
  E("27 February 2027", "27. Februar 2027", "27 กุมภาพันธ์ 2027", "2027年2月27日");
  E("28 February 2027", "28. Februar 2027", "28 กุมภาพันธ์ 2027", "2027年2月28日");
  E("1 March 2027", "1. März 2027", "1 มีนาคม 2027", "2027年3月1日");
  E("Souphattra Heritage Vientiane sits at the heart of the wedding stay. For hotel rooms, the first night is your guest contribution and the second night is hosted, with breakfast on both mornings. Rooms are limited:",
    "Das Souphattra Heritage Vientiane ist das Herz des Hochzeitsaufenthalts. Bei Hotelzimmern übernehmt ihr die erste Nacht selbst; die zweite Nacht übernehmen Haruthai & Suthep für euch — mit Frühstück an beiden Morgen. Die Zimmer sind begrenzt:",
    "สุพัตรา เฮอริเทจ เวียงจันทน์ คือหัวใจของการพักช่วงงานแต่ง สำหรับห้องพักโรงแรม คืนแรกคือส่วนร่วมของคุณ คืนที่สองเจ้าภาพดูแล พร้อมอาหารเช้าทั้งสองวัน ห้องมีจำนวนจำกัด:",
    "スパッタラ・ヘリテージは滞在の中心です。ホテル客室は1泊目がご負担、2泊目はご招待——朝食は両日付き。客室数には限りがあります：");
  E("The journey begins in Bangkok: the overnight sleeper train to Nong Khai — a central experience of the journey before the wedding — then onward across the border to Vientiane. Full travel details follow, so please wait for our green light before booking.",
    "Die Reise beginnt in Bangkok: der Nachtzug nach Nong Khai — ein zentrales Erlebnis der Reise vor der Hochzeit — dann weiter über die Grenze nach Vientiane. Alle Reisedetails folgen; bitte wartet auf unser grünes Licht, bevor ihr bucht.",
    "การเดินทางเริ่มที่กรุงเทพฯ รถไฟตู้นอนสู่หนองคาย ประสบการณ์สำคัญก่อนวันงาน แล้วข้ามพรมแดนสู่เวียงจันทน์ รายละเอียดจะตามมา โปรดรอสัญญาณจากเราก่อนจอง",
    "旅はバンコクから。ノーンカーイへの夜行寝台列車——挙式前の旅の中心となる体験——そして国境を越えビエンチャンへ。詳細は追ってご案内しますので、ご予約は合図をお待ちください。");
  E("Entry requirements depend on your passport; Guest Relations will share the relevant guidance with you before travel, and our team meets you at immigration. Currency · Lao Kip (LAK).",
    "Die Einreisebestimmungen hängen von eurem Pass ab; Guest Relations teilt euch vor der Reise die passenden Hinweise mit, und unser Team empfängt euch an der Einreise. Währung · Lao Kip (LAK).",
    "ข้อกำหนดการเข้าเมืองขึ้นกับหนังสือเดินทางของคุณ ฝ่ายดูแลแขกจะแจ้งแนวทางก่อนเดินทาง และทีมของเรารอรับที่ด่านตรวจคนเข้าเมือง สกุลเงิน · กีบลาว (LAK)",
    "入国要件はパスポートにより異なります。ご出発前にゲストリレーションズがご案内し、入国審査では私たちのチームがお迎えします。通貨・ラオスキープ（LAK）。");
  E("Before you travel, Khun Ket and Khun Paddy are here for anything you may need.",
    "Vor eurer Reise sind Khun Ket und Khun Paddy persönlich für euch da, wenn ihr etwas braucht.",
    "ก่อนออกเดินทาง หากมีอะไรที่อยากให้เราช่วย คุณเกตุและคุณแพดดี้พร้อมดูแลคุณเสมอ",
    "ご出発前に何かございましたら、クン・ケットとクン・パディが直接お手伝いいたします。");
  E("Write to:", "Schreibt uns:", "อีเมล:", "メール：");
  E("Or reach us on LINE using the original QR code below.",
    "Oder erreicht uns über LINE mit dem Original-QR-Code unten.",
    "หรือติดต่อเราทาง LINE ผ่านคิวอาร์โค้ดต้นฉบับด้านล่าง",
    "LINEは、下のオリジナルQRコードからご連絡いただけます。");
  E("Original LINE QR code", "Original-QR-Code für LINE", "คิวอาร์โค้ด LINE ต้นฉบับ", "LINEのオリジナルQRコード");
    E("continue to Kunming and Lijiang after the wedding. Guests who would like to join part of the onward journey are warmly welcome to speak with Guest Relations.",
    "reisen nach der Hochzeit weiter nach Kunming und Lijiang. Gäste, die einen Teil der Weiterreise mitgehen möchten, sind herzlich eingeladen, mit Guest Relations zu sprechen.",
    "เดินทางต่อไปคุนหมิงและลี่เจียงหลังงานแต่ง แขกที่อยากร่วมเส้นทางบางช่วง ยินดีพูดคุยกับฝ่ายดูแลแขกได้เสมอ",
    "は挙式後、昆明と麗江へ旅を続けます。行程の一部にご一緒したい方は、ぜひゲストリレーションズへ。");
  E("The journey to Vientiane, and onward", "Die Reise nach Vientiane und weiter", "เส้นทางสู่เวียงจันทน์และต่อจากนั้น", "ビエンチャンへ、そしてその先へ");
  E("To the wedding", "Zur Hochzeit", "สู่งานแต่ง", "挙式へ");
  E("Onward, optional", "Weiter, optional", "เดินทางต่อ ตามสมัครใจ", "その先へ（任意）");
  E("timings to be confirmed", "Zeiten werden bestätigt", "จะยืนยันเวลาอีกครั้ง", "時刻は追って確定");
  E("Detailed travel timings and booking guidance will follow. Please wait for our green light before booking.",
    "Genaue Reisezeiten und Buchungshinweise folgen. Bitte wartet auf unser grünes Licht, bevor ihr bucht.",
    "เวลาเดินทางโดยละเอียดและคำแนะนำการจองจะตามมา โปรดรอสัญญาณจากเราก่อนจอง",
    "詳しい時刻とご予約のご案内は追ってお送りします。合図をお待ちください。");
  E("For guests continuing the journey: 1 March Vientiane to Kunming · 4 March Kunming to Lijiang · 6 March Lijiang to Bangkok",
    "Für Gäste, die weiterreisen: 1. März Vientiane–Kunming · 4. März Kunming–Lijiang · 6. März Lijiang–Bangkok",
    "สำหรับแขกที่เดินทางต่อ 1 มี.ค. เวียงจันทน์–คุนหมิง · 4 มี.ค. คุนหมิง–ลี่เจียง · 6 มี.ค. ลี่เจียง–กรุงเทพฯ",
    "旅を続ける方へ：3月1日ビエンチャン→昆明・3月4日昆明→麗江・3月6日麗江→バンコク");
  E("Open your invitation", "Öffnet eure Einladung", "เปิดบัตรเชิญของคุณ", "招待状を開く");
  E("Your invitation and your journey are already prepared.", "Eure Einladung und eure Reise sind bereits vorbereitet.", "บัตรเชิญและการเดินทางของคุณถูกเตรียมไว้แล้ว", "招待状と旅は、すでに用意されています。");
  E("Find your invitation", "Findet eure Einladung", "ค้นหาบัตรเชิญของคุณ", "招待状を見つける");
  E("and tell us which parts of the journey you are joining.", "und sagt uns, welche Teile der Reise ihr mitgeht.", "แล้วบอกเราว่าคุณจะร่วมช่วงใดของการเดินทาง", "旅のどの行程にご一緒くださるか、お聞かせください。");
  E("Choose your stay", "Wählt euren Aufenthalt", "เลือกที่พักของคุณ", "滞在を選ぶ");
  E("Simply request your room — Guest Relations coordinates your arrival and every transfer personally. Everything you send is a request; nothing is booked until Guest Relations confirms it with you.",
    "Fragt einfach euer Zimmer an — Guest Relations koordiniert eure Ankunft und jeden Transfer persönlich. Alles, was ihr sendet, ist eine Anfrage; nichts ist gebucht, bis Guest Relations es mit euch bestätigt.",
    "เพียงส่งคำขอห้องพัก ฝ่ายดูแลแขกจะประสานการมาถึงและการรับส่งทุกครั้งด้วยตนเอง ทุกอย่างที่ส่งคือคำขอ จะยังไม่จองจนกว่าเราจะยืนยันกับคุณ",
    "お部屋をリクエストするだけ——ご到着もすべての送迎もゲストリレーションズが直接調整します。お送りいただく内容はリクエストであり、確定のご連絡までは予約は成立しません。");
  E("Guest Relations confirms", "Guest Relations bestätigt", "ฝ่ายดูแลแขกยืนยัน", "ゲストリレーションズが確定");
  E("Enjoy the ride", "Genießt die Reise", "เพลิดเพลินกับการเดินทาง", "旅をお楽しみに");
  E("From the moment you land, you're our guest, personally looked after from arrival to the last goodbye.",
    "Vom Moment der Landung an seid ihr unsere Gäste — persönlich umsorgt von der Ankunft bis zum letzten Abschied.",
    "ตั้งแต่วินาทีที่คุณลงเครื่อง คุณคือแขกของเรา ได้รับการดูแลเป็นการส่วนตัวตั้งแต่มาถึงจนถึงคำอำลา",
    "着陸の瞬間から、あなたは私たちのゲスト。到着から最後のお見送りまで、心を込めておもてなしします。");
  E("This website is your invitation to the journey: what the weekend feels like, where you'll stay, what to pack, what to wear. Everything you need to arrive prepared and unhurried.",
    "Diese Webseite ist eure Einladung zur Reise: wie sich das Wochenende anfühlt, wo ihr wohnt, was ihr einpackt, was ihr tragt. Alles, um vorbereitet und ohne Eile anzukommen.",
    "เว็บไซต์นี้คือคำเชิญสู่การเดินทาง สุดสัปดาห์จะเป็นอย่างไร พักที่ไหน เตรียมอะไร แต่งกายอย่างไร ทุกสิ่งเพื่อให้คุณมาถึงอย่างพร้อมและไม่รีบร้อน",
    "このサイトは旅への招待状。週末の空気、滞在先、持ち物、装い——落ち着いて到着するためのすべてを。");
  E("is where you open your invitation, find the people you travel with and register your journey. After Guest Relations confirms you, your personal details continue there.",
    "ist der Ort, an dem ihr eure Einladung öffnet, eure Mitreisenden findet und eure Reise registriert. Nach der Bestätigung durch Guest Relations geht es dort mit euren persönlichen Details weiter.",
    "คือที่ที่คุณเปิดบัตรเชิญ พบผู้ร่วมเดินทาง และลงทะเบียนการเดินทาง หลังฝ่ายดูแลแขกยืนยัน รายละเอียดส่วนตัวของคุณจะดำเนินต่อที่นั่น",
    "では招待状を開き、ご一緒する方々を確認し、旅を登録します。確定後は、あなたの詳細もそこで続きます。");
  E("Private · by secure link, after registration", "Privat · über sicheren Link, nach der Registrierung", "ส่วนตัว · ผ่านลิงก์ปลอดภัย หลังลงทะเบียน", "プライベート・登録後、安全なリンクで");
  E("Your final itinerary, with exact times", "Euer endgültiger Reiseplan mit genauen Zeiten", "กำหนดการสุดท้ายพร้อมเวลาที่แน่นอน", "正確な時刻入りの最終旅程");
  E("Meeting points and every transfer", "Treffpunkte und jeder Transfer", "จุดนัดพบและการรับส่งทุกเที่ยว", "集合場所とすべての送迎");
  E("Travel documents, ready to download", "Reisedokumente zum Herunterladen", "เอกสารเดินทางพร้อมดาวน์โหลด", "ダウンロードできる旅の書類");
  E("Live updates and gentle reminders", "Live-Updates und sanfte Erinnerungen", "อัปเดตสดและการแจ้งเตือนอย่างนุ่มนวล", "最新情報とやさしいリマインド");
  E("Anything specific to you and your room", "Alles rund um euch und euer Zimmer", "ทุกอย่างที่เกี่ยวกับคุณและห้องของคุณ", "あなたとお部屋にまつわるすべて");
  E("This site answers", "Diese Seite beantwortet", "เว็บไซต์นี้ตอบคำถาม", "このサイトが答えるのは");
  E("Your Guest Area answers", "Euer Gästebereich beantwortet", "ส่วนสำหรับแขกตอบคำถาม", "ゲストエリアが答えるのは");
  E("Open your invitation, choose your journey, and Guest Relations takes it from there.",
    "Öffnet eure Einladung, wählt eure Reise — den Rest übernimmt Guest Relations.",
    "เปิดบัตรเชิญ เลือกการเดินทาง แล้วฝ่ายดูแลแขกดูแลต่อจากนั้น",
    "招待状を開き、旅を選べば、あとはゲストリレーションズにお任せ。");
  E("Contact", "Kontakt", "ติดต่อเรา", "お問い合わせ");
  E("Arrival & Stay", "Ankunft & Aufenthalt", "การมาถึงและการพัก", "到着と滞在");
  E("Elegant Resort Wear", "Elegante Resort-Garderobe", "ชุดรีสอร์ตหรู", "エレガント・リゾートウェア");
  E("Lao Traditional Dress", "Traditionelle laotische Kleidung", "ชุดไทย-ลาวประเพณี", "ラオスの伝統衣装");
  E("Black Tie", "Black Tie", "แบล็กไท", "ブラックタイ");
  E("Linen, silk, soft colour. Breathable and unhurried, made for warm afternoons in the courtyard.",
    "Leinen, Seide, sanfte Farben. Atmungsaktiv und entspannt — gemacht für warme Nachmittage im Innenhof.",
    "ลินิน ไหม โทนสีอ่อนโยน ระบายอากาศดีและผ่อนคลาย เหมาะกับบ่ายอบอุ่นในลานบ้าน",
    "リネン、シルク、やわらかな色。通気よく、ゆったりと。中庭の暖かな午後のために。");
  E("The morning ritual asks for covered shoulders and a long skirt. Sinh and silk scarves can be arranged in Vientiane if you would rather not travel with them.",
    "Das Morgenritual bittet um bedeckte Schultern und einen langen Rock. Sinh und Seidenschals können in Vientiane arrangiert werden, wenn ihr sie nicht mitbringen möchtet.",
    "พิธียามเช้าขอให้คลุมไหล่และสวมผ้าซิ่นยาว หากไม่สะดวกนำมา เราจัดหาซิ่นและผ้าสไบไหมที่เวียงจันทน์ได้",
    "朝の儀式では肩を覆い、長いスカートを。シンやシルクのスカーフは、ビエンチャンでのご用意も可能です。");
  E("Alms Giving · at dawn", "Morgenritual · im Morgengrauen", "พิธีตักบาตร · ยามรุ่งสาง", "托鉢の儀・夜明けに");
  E("Women", "Damen", "สุภาพสตรี", "女性");
  E("Men", "Herren", "สุภาพบุรุษ", "男性");
  E("Colour", "Farbe", "โทนสี", "色");
  E("Comfort", "Komfort", "ความสบาย", "快適さ");
  E("Respect", "Respekt", "ความเคารพ", "敬意");
  E("Footwear", "Schuhe", "รองเท้า", "履物");
  E("Flowing dresses, elegant separates, sandals", "Fließende Kleider, elegante Kombinationen, Sandalen", "เดรสพลิ้ว เซ็ตหรู รองเท้าแตะสวย", "流れるようなドレス、上品なセパレート、サンダル");
  E("Linen shirt, chinos or tailored shorts, loafers", "Leinenhemd, Chinos oder elegante Shorts, Loafer", "เชิ้ตลินิน กางเกงชิโนหรือกางเกงขาสั้นตัดเย็บดี รองเท้าโลฟเฟอร์", "リネンシャツ、チノパンまたはテーラードショーツ、ローファー");
  E("Ivory, sand, soft botanicals", "Ivory, Sand, sanfte Botanicals", "งาช้าง ทราย ลายพฤกษาอ่อน", "アイボリー、サンド、やさしいボタニカル");
  E("Vientiane is warm; choose fabric over structure", "Vientiane ist warm; wählt Stoff statt Struktur", "เวียงจันทน์อากาศอบอุ่น เลือกเนื้อผ้าเบาสบาย", "ビエンチャンは暖か。かっちりより軽やかな素材を");
  E("Sinh (Lao skirt) with a blouse with covered shoulders and pha biang scarf", "Sinh (laotischer Rock) mit schulterbedeckender Bluse und Pha-Biang-Schal", "ผ้าซิ่นลาวกับเสื้อคลุมไหล่และผ้าสไบเบี่ยง", "シン（ラオスのスカート）に肩を覆うブラウス、パービアンのスカーフ");
  E("Long trousers with a shirt; a silk scarf if you have one", "Lange Hose mit Hemd; ein Seidenschal, falls vorhanden", "กางเกงขายาวกับเชิ้ต หากมีผ้าสไบไหมยิ่งดี", "長ズボンにシャツ。シルクのスカーフがあればぜひ");
  E("Shoulders and knees covered throughout the ritual", "Schultern und Knie während des Rituals bedeckt", "คลุมไหล่และเข่าตลอดพิธี", "儀式の間は肩と膝を覆って");
  E("Shoes that slip off easily; you will be barefoot at moments", "Schuhe zum leichten Ausziehen; zeitweise seid ihr barfuß", "รองเท้าถอดง่าย บางช่วงต้องเดินเท้าเปล่า", "脱ぎやすい靴を。素足になる場面があります");
  E("See you in Laos?", "Wir sehen uns in Laos?", "แล้วพบกันที่ลาวนะ", "ラオスで会いましょう");
  E("LINE & WhatsApp QR in your Guest Area", "LINE- & WhatsApp-QR in eurem Gästebereich", "QR ของ LINE และ WhatsApp อยู่ในส่วนสำหรับแขก", "LINE・WhatsAppのQRはゲストエリアに");
  E("Laos is not the backdrop. It is the heart of it. Alms given at dawn, riverside temples, and the warmth of Lao hospitality.",
    "Laos ist keine Kulisse. Es ist das Herz von allem. Almosen im Morgengrauen, Tempel am Fluss und die Wärme laotischer Gastfreundschaft.",
    "ลาวไม่ใช่ฉากหลัง แต่คือหัวใจของทุกสิ่ง การตักบาตรยามรุ่งสาง วัดริมแม่น้ำ และไมตรีอันอบอุ่นของชาวลาว",
    "ラオスは背景ではなく、この物語の心そのもの。夜明けの托鉢、川辺の寺院、ラオスのあたたかなもてなし。");

  /* ---- sweep closure: transfer catalog, home cards, plans, GR card ---- */
  E("One plan for all of us", "Ein Plan für uns alle", "แผนเดียวสำหรับเราทุกคน", "全員でひとつのプラン");
  E("We have different plans", "Wir haben unterschiedliche Pläne", "เรามีแผนต่างกัน", "それぞれ別のプラン");
  E("Shared Shuttle", "Gemeinschaftsshuttle", "รถรับส่งรวม", "シャトル（乗合）");
  E("Complimentary Shared Shuttle", "Kostenfreier Gemeinschaftsshuttle", "รถรับส่งรวมไม่มีค่าใช้จ่าย", "無料シャトル（乗合）");
  E("Airport", "Flughafen", "สนามบิน", "空港");
  E("Airport Pickup by Jaguar", "Flughafenabholung im Jaguar", "รับจากสนามบินด้วยรถจากัวร์", "ジャガーで空港お迎え");
  E("Airport Drop Off by Jaguar", "Flughafentransfer im Jaguar (Abreise)", "ส่งไปสนามบินด้วยรถจากัวร์", "ジャガーで空港お見送り");
  E("Airport Pickup by Mercedes-Benz", "Flughafenabholung im Mercedes-Benz", "รับจากสนามบินด้วยเมอร์เซเดส-เบนซ์", "メルセデス・ベンツで空港お迎え");
  E("Airport Drop Off by Mercedes-Benz", "Flughafentransfer im Mercedes-Benz (Abreise)", "ส่งไปสนามบินด้วยเมอร์เซเดส-เบนซ์", "メルセデス・ベンツで空港お見送り");
  E("Nong Khai Railway Station", "Bahnhof Nong Khai", "สถานีรถไฟหนองคาย", "ノーンカーイ駅");
  E("Nong Khai Station to Souphattra Heritage", "Bahnhof Nong Khai zum Souphattra Heritage", "จากสถานีหนองคายสู่สุพัตรา เฮอริเทจ", "ノーンカーイ駅からスパッタラ・ヘリテージへ");
  E("LCR Railway Station", "LCR-Bahnhof", "สถานีรถไฟ LCR", "LCR鉄道駅");
  E("LCR Station to Hotel by Jaguar", "LCR-Bahnhof zum Hotel im Jaguar", "จากสถานี LCR สู่โรงแรมด้วยรถจากัวร์", "ジャガーでLCR駅からホテルへ");
  E("Hotel to LCR Station by Jaguar", "Hotel zum LCR-Bahnhof im Jaguar", "จากโรงแรมสู่สถานี LCR ด้วยรถจากัวร์", "ジャガーでホテルからLCR駅へ");
  E("LCR Station to Hotel by Mercedes-Benz", "LCR-Bahnhof zum Hotel im Mercedes-Benz", "จากสถานี LCR สู่โรงแรมด้วยเมอร์เซเดส-เบนซ์", "メルセデス・ベンツでLCR駅からホテルへ");
  E("Hotel to LCR Station by Mercedes-Benz", "Hotel zum LCR-Bahnhof im Mercedes-Benz", "จากโรงแรมสู่สถานี LCR ด้วยเมอร์เซเดส-เบนซ์", "メルセデス・ベンツでホテルからLCR駅へ");
  E("Shared ride with fellow guests · luggage handled · Guest Relations confirms your seat", "Gemeinsame Fahrt mit anderen Gästen · Gepäck inklusive · Guest Relations bestätigt euren Platz", "นั่งร่วมกับแขกท่านอื่น · ดูแลสัมภาระ · ฝ่ายดูแลแขกยืนยันที่นั่ง", "他のゲストと乗合・荷物のお世話付き・お席はゲストリレーションズが確定");
  E("Private vehicle and driver · met personally · luggage handled", "Privatwagen mit Fahrer · persönlicher Empfang · Gepäck inklusive", "รถส่วนตัวพร้อมคนขับ · มีคนรอรับ · ดูแลสัมภาระ", "専用車とドライバー・直接お出迎え・荷物のお世話付き");
  E("Private vehicle and driver · met at your carriage exit · luggage handled", "Privatwagen mit Fahrer · Empfang direkt am Waggon · Gepäck inklusive", "รถส่วนตัวพร้อมคนขับ · รอรับหน้าตู้โดยสาร · ดูแลสัมภาระ", "専用車とドライバー・車両出口でお出迎え・荷物のお世話付き");
  E("From Wattay International Airport to Souphattra Heritage, met in the arrivals hall.", "Vom Wattay International Airport zum Souphattra Heritage, Empfang in der Ankunftshalle.", "จากสนามบินวัตไตสู่สุพัตรา เฮอริเทจ มีคนรอรับที่โถงผู้โดยสารขาเข้า", "ワッタイ国際空港からスパッタラ・ヘリテージへ。到着ロビーでお出迎え。");
  E("From Souphattra Heritage to Wattay International Airport for your departure.", "Vom Souphattra Heritage zum Wattay International Airport zur Abreise.", "จากสุพัตรา เฮอริเทจ สู่สนามบินวัตไตสำหรับขากลับ", "ご出発時、スパッタラ・ヘリテージからワッタイ国際空港へ。");
  E("From Vientiane railway station to Souphattra Heritage, met at your carriage exit.", "Vom Bahnhof Vientiane zum Souphattra Heritage, Empfang direkt am Waggon.", "จากสถานีรถไฟเวียงจันทน์สู่สุพัตรา เฮอริเทจ รอรับหน้าตู้โดยสาร", "ビエンチャン駅からスパッタラ・ヘリテージへ。車両出口でお出迎え。");
  E("From Souphattra Heritage to Vientiane railway station for your onward journey.", "Vom Souphattra Heritage zum Bahnhof Vientiane für eure Weiterreise.", "จากสุพัตรา เฮอริเทจ สู่สถานีรถไฟเวียงจันทน์สำหรับการเดินทางต่อ", "スパッタラ・ヘリテージからビエンチャン駅へ、その先の旅のために。");
  E("Choose your room", "Wählt euer Zimmer", "เลือกห้องของคุณ", "お部屋を選ぶ");
  E("Your way to Laos", "Euer Weg nach Laos", "เส้นทางสู่ลาวของคุณ", "ラオスへの道");
  E("Train, transfers and your own way, each with its price", "Zug, Transfers und euer eigener Weg — jeweils mit Preis", "รถไฟ การรับส่ง หรือแบบของคุณเอง พร้อมราคาแต่ละแบบ", "列車、送迎、ご自身の方法——それぞれの料金で");
  E("No stay selected yet", "Noch kein Aufenthalt gewählt", "ยังไม่ได้เลือกที่พัก", "滞在は未選択");
  E("Guest Relations", "Guest Relations", "ฝ่ายดูแลแขก", "ゲストリレーションズ");
  E("Fly or travel on your own schedule; we meet you there", "Fliegt oder reist nach eurem eigenen Plan; wir empfangen euch dort", "บินหรือเดินทางตามแผนของคุณเอง แล้วพบกันที่นั่น", "ご自身の予定で移動を。現地でお迎えします");
  E("Alms Giving 05:00 AM · Vow Ceremony 04:30 PM · Wedding Dinner 07:30 PM · Souphattra Heritage Vientiane",
    "Morgenritual 05:00 Uhr · Eheversprechen 16:30 Uhr · Hochzeitsdinner 19:30 Uhr · Souphattra Heritage Vientiane",
    "ตักบาตร 05:00 น. · พิธีกล่าวคำสัญญา 16:30 น. · งานเลี้ยงมงคลสมรส 19:30 น. · สุพัตรา เฮอริเทจ เวียงจันทน์",
    "托鉢の儀 5:00・誓いの式 16:30・ウェディングディナー 19:30・スパッタラ・ヘリテージ");

  /* ---- final closure: composed labels, room editorial, specs ---- */
  E("Pre-Wedding Journey · Optional · Before the wedding", "Reise vor der Hochzeit · Optional · Vor der Hochzeit", "การเดินทางก่อนวันงาน · ทางเลือก · ก่อนวันงาน", "ウェディング前の旅・任意・挙式前");
  E("Post-Wedding Journey · Optional · After the wedding", "Reise nach der Hochzeit · Optional · Nach der Hochzeit", "การเดินทางหลังวันงาน · ทางเลือก · หลังวันงาน", "ウェディング後の旅・任意・挙式後");
  E("Not selected yet · choose under My Stay", "Noch nicht gewählt · unter „Mein Aufenthalt“ wählen", "ยังไม่ได้เลือก · เลือกที่ ที่พักของฉัน", "未選択・「宿泊」からお選びください");
  E("Your departure · follows your onward itinerary", "Eure Abreise · folgt eurer Weiterreise", "การเดินทางกลับ · ตามแผนการเดินทางต่อของคุณ", "ご出発・その後のご旅程に合わせて");
  E("Shared ride with fellow guests · luggage handled · Guest Relations confirms your slot personally", "Gemeinsame Fahrt mit anderen Gästen · Gepäck inklusive · Guest Relations bestätigt euren Platz persönlich", "นั่งร่วมกับแขกท่านอื่น · ดูแลสัมภาระ · ฝ่ายดูแลแขกยืนยันรอบรถให้คุณ", "他のゲストと乗合・荷物のお世話付き・お時間はゲストリレーションズが確定");
  E("total contribution per guest", "Gesamtkosten pro Gast", "ยอดร่วมสมทบต่อท่าน", "お一人あたりのご負担額");
  E("Complimentary · personally coordinated", "Kostenfrei · persönlich koordiniert", "ไม่มีค่าใช้จ่าย · ประสานงานเป็นการส่วนตัว", "無料・個別に調整");
  E("Accommodation", "Unterkunft", "ที่พัก", "宿泊");
  E("1st–3rd floor", "1.–3. Etage", "ชั้น 1–3", "1〜3階");
  E("Pool and garden views · one suite only", "Pool- und Gartenblick · nur eine Suite", "วิวสระและสวน · มีเพียงห้องเดียว", "プール＆ガーデンビュー・一室のみ");
  E("Colonial French elegance in 31 square metres, with a private balcony over the garden.",
    "Französisch-koloniale Eleganz auf 31 Quadratmetern, mit privatem Balkon zum Garten.",
    "ความหรูสไตล์โคโลเนียลฝรั่งเศสใน 31 ตารางเมตร พร้อมระเบียงส่วนตัวมองสวน",
    "31平米に息づくフレンチコロニアルの気品。庭を望むプライベートバルコニー付き。");
  E("French colonial rooms with a balcony over the garden, and the flexibility a family needs.",
    "Französisch-koloniale Zimmer mit Gartenbalkon und der Flexibilität, die eine Familie braucht.",
    "ห้องสไตล์โคโลเนียลฝรั่งเศสพร้อมระเบียงมองสวน และความยืดหยุ่นที่ครอบครัวต้องการ",
    "庭を望むバルコニーのあるフレンチコロニアルの客室。家族にうれしい柔軟さも。");
  E("A larger heritage room, with a private balcony over the garden and the pool.",
    "Ein größeres Heritage-Zimmer mit privatem Balkon zu Garten und Pool.",
    "ห้องเฮอริเทจที่กว้างขึ้น พร้อมระเบียงส่วนตัวมองสวนและสระ",
    "より広いヘリテージルーム。庭とプールを望むプライベートバルコニー付き。");
  E("A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool.",
    "Ein 63 Quadratmeter großes Refugium mit Kingbett, zwei Bädern, separatem Wohnbereich und privatem Balkon mit Blick auf Garten und Pool.",
    "ที่พัก 63 ตารางเมตร พร้อมเตียงคิง ห้องน้ำสองห้อง พื้นที่นั่งเล่นแยก และระเบียงส่วนตัวมองสวนและสระ",
    "63平米の隠れ家。キングベッド、バスルーム2つ、独立したリビング、庭とプールを見渡すバルコニー。");
  E("French colonial and Laotian design: a living room under a high ceiling, and a slower kind of morning.",
    "Französisch-koloniales und laotisches Design: ein Wohnraum unter hoher Decke und ein langsamerer Morgen.",
    "ดีไซน์โคโลเนียลฝรั่งเศสผสานลาว ห้องนั่งเล่นเพดานสูง และเช้าที่ช้าลงอีกนิด",
    "フレンチコロニアルとラオスの意匠。高い天井のリビングと、ゆっくり流れる朝。");
  E("The house suite: a separate living area, pantry and bar, and a long balcony over the pool.",
    "Die Haussuite: separater Wohnbereich, Pantry und Bar, und ein langer Balkon über dem Pool.",
    "สวีทประจำบ้าน พื้นที่นั่งเล่นแยก แพนทรีและบาร์ พร้อมระเบียงยาวเหนือสระ",
    "館のスイート。独立リビング、パントリーとバー、プールに沿う長いバルコニー。");
  E("The largest suite of the house: two bedrooms, private bathrooms and a shared living space under a high ceiling.",
    "Die größte Suite des Hauses: zwei Schlafzimmer, eigene Bäder und ein gemeinsamer Wohnraum unter hoher Decke.",
    "สวีทที่ใหญ่ที่สุดของบ้าน สองห้องนอน ห้องน้ำในตัว และพื้นที่นั่งเล่นร่วมใต้เพดานสูง",
    "館で最も広いスイート。2つのベッドルーム、専用バス、高天井のリビング。");
  E("The sleeper train north through the night — one of the defining transitions of the Bangkok Journey. Eight seats, kept small on purpose.",
    "Der Schlafwagenzug nach Norden durch die Nacht — einer der prägenden Übergänge der Bangkok-Reise. Acht Plätze, bewusst klein gehalten.",
    "รถไฟตู้นอนมุ่งเหนือตลอดคืน หนึ่งในช่วงเปลี่ยนผ่านสำคัญของทริปกรุงเทพฯ แปดที่นั่ง ตั้งใจให้เล็กและอบอุ่น",
    "夜を走り北へ向かう寝台列車——バンコクの旅を象徴する移動のひとつ。あえて8席だけの小さな旅。");
  E("Bathrobe", "Bademantel", "เสื้อคลุมอาบน้ำ", "バスローブ");
  E("Bathtub", "Badewanne", "อ่างอาบน้ำ", "バスタブ");
  E("Coffee & tea facilities", "Kaffee- & Teestation", "ชุดชงชากาแฟ", "コーヒー＆ティーセット");
  E("Coffee & tea making facilities", "Kaffee- & Teestation", "ชุดชงชากาแฟ", "コーヒー＆ティーセット");
  E("Hair dryer", "Föhn", "ไดร์เป่าผม", "ヘアドライヤー");
  E("Mini bar", "Minibar", "มินิบาร์", "ミニバー");
  E("Nespresso machine", "Nespresso-Maschine", "เครื่องเนสเพรสโซ", "ネスプレッソマシン");
  E("Safe deposit box", "Safe", "ตู้นิรภัย", "セーフティボックス");
  E("Shower", "Dusche", "ฝักบัว", "シャワー");
  E("Slippers", "Hausschuhe", "รองเท้าแตะในห้อง", "スリッパ");
  E("Smart TV", "Smart-TV", "สมาร์ททีวี", "スマートテレビ");
  E("Wardrobe", "Kleiderschrank", "ตู้เสื้อผ้า", "ワードローブ");
  E("WiFi access", "WLAN", "ไวไฟ", "Wi-Fi");
  E("Balcony", "Balkon", "ระเบียง", "バルコニー");
  E("Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket",
    "Zentrum von Vientiane · 300 m zum Mekong-Nachtmarkt · 800 m zum Wat Sisaket",
    "ใจกลางเวียงจันทน์ · 300 ม. ถึงตลาดกลางคืนริมโขง · 800 ม. ถึงวัดสีสะเกด",
    "ビエンチャン中心部・メコンナイトマーケットまで300m・ワット・シーサケットまで800m");

  E("total contribution · per guest", "Gesamtkosten · pro Gast", "ยอดร่วมสมทบ · ต่อท่าน", "ご負担額・お一人につき");
  E("Garden views · interconnecting rooms where available", "Gartenblick · Verbindungszimmer wo verfügbar", "วิวสวน · มีห้องเชื่อมถึงกันในบางห้อง", "ガーデンビュー・コネクティングルームあり（一部）");
  E("Garden and pool views", "Garten- und Poolblick", "วิวสวนและสระ", "ガーデン＆プールビュー");
  E("Private balcony", "Privater Balkon", "ระเบียงส่วนตัว", "プライベートバルコニー");
  E("Bathroom amenities", "Badezimmer-Amenities", "ของใช้ในห้องน้ำ", "バスアメニティ");
  E("Ground floor · central greenery · one suite only", "Erdgeschoss · zentrales Grün · nur eine Suite", "ชั้นล่าง · กลางสวนเขียว · มีเพียงห้องเดียว", "1階・緑の中心・一室のみ");
  E("High ceiling", "Hohe Decke", "เพดานสูง", "高天井");
  E("Separate living area", "Separater Wohnbereich", "พื้นที่นั่งเล่นแยก", "独立したリビング");
  E("Living room", "Wohnzimmer", "ห้องนั่งเล่น", "リビングルーム");
  E("Two bathrooms", "Zwei Bäder", "ห้องน้ำสองห้อง", "バスルーム2つ");

  /* ---- SOURCE-INVENTORY CLOSURE (P0 directive §5): every remaining public string ---- */
  E("are getting married, and you are invited on the journey.", "heiraten — und ihr seid eingeladen, die Reise mitzugehen.", "กำลังจะแต่งงาน และคุณได้รับเชิญให้ร่วมเดินทางไปด้วยกัน", "が結婚します。そして、あなたをこの旅にご招待します。");
  E("Scroll to explore", "Scrollen und entdecken", "เลื่อนเพื่อสำรวจ", "スクロールして探索");
  E("How this journey is made", "Wie diese Reise entsteht", "การเดินทางนี้ถูกสร้างขึ้นอย่างไร", "この旅のつくりかた");
  E("Presence", "Gegenwart", "การอยู่ตรงนั้น", "その場に在ること");
  E("Orientation", "Orientierung", "ทิศทางที่ชัดเจน", "見通し");
  E("Calm", "Ruhe", "ความสงบ", "静けさ");
  E("Evening", "Abend", "ยามเย็น", "夜");
  E("Arrival, ceremony and dinner are each designed so you can be fully present, not moved through a schedule.",
    "Ankunft, Zeremonie und Dinner sind so gestaltet, dass ihr ganz gegenwärtig sein könnt — statt durch einen Zeitplan geschoben zu werden.",
    "การมาถึง พิธี และงานเลี้ยง ล้วนออกแบบให้คุณได้อยู่กับช่วงเวลานั้นอย่างเต็มที่ ไม่ใช่ถูกพาไปตามตาราง",
    "到着も、式も、ディナーも——予定に追われるのではなく、その瞬間に心から居られるように設えています。");
  E("Timing, transitions and locations are made clear in advance. Nobody has to guess what happens next.",
    "Zeiten, Übergänge und Orte werden vorab klar kommuniziert. Niemand muss raten, was als Nächstes passiert.",
    "เวลา การเปลี่ยนผ่าน และสถานที่ ทุกอย่างแจ้งให้ทราบล่วงหน้า ไม่มีใครต้องเดาว่าจะเกิดอะไรต่อไป",
    "時間も移動も場所も、事前にはっきりと。次に何が起こるか、誰も迷いません。");
  E("Free time stays unstructured. Here, luxury means the absence of pressure, not the presence of activity.",
    "Freie Zeit bleibt frei. Luxus heißt hier: Abwesenheit von Druck, nicht Fülle von Programm.",
    "เวลาว่างคือเวลาว่างจริง ๆ ที่นี่ ความหรูหราคือการไม่มีแรงกดดัน ไม่ใช่การมีกิจกรรมมากมาย",
    "自由な時間は、自由なまま。ここでの贅沢とは、予定の多さではなく、追われないことです。");
  E("We are not creating a wedding.", "Wir gestalten keine Hochzeit.", "เราไม่ได้กำลังจัดงานแต่งงาน", "私たちがつくっているのは、結婚式ではありません。");
  E("We are creating a shared experience.", "Wir gestalten ein gemeinsames Erlebnis.", "เรากำลังสร้างประสบการณ์ที่มีร่วมกัน", "分かち合う体験を、つくっています。");
  E("Travel first. Wedding second.", "Erst die Reise. Dann die Hochzeit.", "การเดินทางมาก่อน งานแต่งตามมา", "まず旅、それから式。");
  E("Instead of a single evening, we are inviting you into a journey: a few days together in Vientiane and a wedding beside the river in Laos.",
    "Statt eines einzelnen Abends laden wir euch zu einer Reise ein: ein paar gemeinsame Tage in Vientiane und eine Hochzeit am Fluss in Laos.",
    "แทนที่จะเป็นค่ำคืนเดียว เราขอเชิญคุณสู่การเดินทาง ไม่กี่วันด้วยกันในเวียงจันทน์ และงานแต่งริมแม่น้ำในลาว",
    "たった一夜ではなく、旅へのご招待。ビエンチャンで共に過ごす数日と、ラオスの川辺での結婚式を。");
  E("One journey, and the people we love.", "Eine Reise — und die Menschen, die wir lieben.", "หนึ่งการเดินทาง กับผู้คนที่เรารัก", "ひとつの旅と、愛する人たち。");
  E("Memory always.", "Erinnerung für immer.", "ความทรงจำตลอดไป", "永遠の記憶に。");
  E("Explore the journey", "Die Reise entdecken", "สำรวจการเดินทาง", "旅を見てみる");
  E("Join the Journey", "Teil der Reise werden", "ร่วมเดินทางไปกับเรา", "旅のはじまりへ");
  E("Open your Guest Area", "Öffnet euren Gästebereich", "เปิดส่วนสำหรับแขกของคุณ", "ゲストエリアを開く");
  E("Menu", "Menü", "เมนู", "メニュー");
  E("Request availability", "Verfügbarkeit anfragen", "สอบถามห้องว่าง", "空室をリクエスト");
  E("Request this room in your Guest Area", "Dieses Zimmer im Gästebereich anfragen", "ขอห้องนี้ในส่วนสำหรับแขก", "ゲストエリアでこの客室をリクエスト");
  E("choose your category", "wählt eure Kategorie", "เลือกประเภทห้องของคุณ", "カテゴリーを選ぶ");
  E("Room choice and availability live in your private Guest Area. Nothing to book, nothing to pay when you arrive.",
    "Zimmerwahl und Verfügbarkeit leben in eurem privaten Gästebereich. Nichts zu buchen, nichts zu zahlen bei der Ankunft.",
    "การเลือกห้องและห้องว่างอยู่ในพื้นที่ส่วนตัวของคุณ ไม่ต้องจอง ไม่ต้องจ่ายเมื่อมาถึง",
    "お部屋の選択と空き状況はプライベートなゲストエリアに。ご到着時のご予約もお支払いも不要です。");
  E("and request it in your Guest Area. A small number of complimentary alternative stays are also available, personally coordinated — Guest Relations is happy to help with rooms, availability or anything individual.",
    "und fragt es in eurem Gästebereich an. Eine kleine Zahl kostenfreier Alternativ-Unterkünfte ist ebenfalls verfügbar, persönlich koordiniert — Guest Relations hilft gern bei Zimmern, Verfügbarkeit oder allem Individuellen.",
    "แล้วส่งคำขอในส่วนสำหรับแขก ยังมีที่พักทางเลือกไม่มีค่าใช้จ่ายจำนวนเล็กน้อย ประสานงานเป็นการส่วนตัว ฝ่ายดูแลแขกยินดีช่วยทุกเรื่อง",
    "ゲストエリアでリクエストを。数に限りある無料のオルタナティブステイもあり、個別に調整——お部屋も空きも、どんなご相談もゲストリレーションズへ。");
  E("A warm private residence in central Vientiane, secured for the wedding stay and hosted for a limited number of guests. Guest Relations coordinates the arrangements personally.",
    "Eine warme private Residenz im Zentrum von Vientiane, für den Hochzeitsaufenthalt gesichert und für eine begrenzte Zahl von Gästen übernommen. Guest Relations koordiniert alles persönlich.",
    "เรสซิเดนซ์ส่วนตัวอันอบอุ่นใจกลางเวียงจันทน์ จัดเตรียมไว้สำหรับช่วงงานแต่งและรองรับแขกจำนวนจำกัด ฝ่ายดูแลแขกประสานงานเป็นการส่วนตัว",
    "ビエンチャン中心部のあたたかなプライベートレジデンス。挙式滞在のために確保し、限られたゲストをご招待。手配はゲストリレーションズが直接調整します。");
  E("Your second hotel night is complimentary — part of the hospitality of your hosts. Room rates and requests live in your private Guest Area. This is a registration request. Guest Relations will confirm your arrangements separately.",
    "Eure zweite Hotelnacht ist kostenfrei — Teil der Gastfreundschaft eurer Gastgeber. Beiträge und Anfragen leben in eurem privaten Gästebereich. Dies ist eine Registrierungsanfrage; Guest Relations bestätigt eure Arrangements separat.",
    "คืนที่สองของโรงแรมไม่มีค่าใช้จ่าย เป็นส่วนหนึ่งของไมตรีจากเจ้าภาพ อัตราและคำขออยู่ในพื้นที่ส่วนตัวของคุณ นี่คือคำขอลงทะเบียน ฝ่ายดูแลแขกจะยืนยันแยกต่างหาก",
    "2泊目はご招待——おふたりのおもてなしの一部です。ご負担額とリクエストはゲストエリアに。これは登録リクエストであり、手配はゲストリレーションズが別途確定します。");
  E("For rooms at Souphattra Heritage Vientiane, your contribution covers the first night. The second night is hosted by",
    "Bei Zimmern im Souphattra Heritage Vientiane übernehmt ihr die erste Nacht selbst. Die zweite Nacht übernehmen",
    "สำหรับห้องพักที่สุพัตรา เฮอริเทจ ส่วนร่วมของคุณครอบคลุมคืนแรก คืนที่สองเป็นของขวัญจาก",
    "スパッタラ・ヘリテージの客室は、ご負担は1泊目のみ。2泊目のご招待は——");
  E("Before the wedding day begins, we gather in the early light for the alms giving at Souphattra Heritage Vientiane. Monks walk in procession, rice is offered, and nothing is hurried. It is a Lao morning, and it opens the whole day.",
    "Bevor der Hochzeitstag beginnt, versammeln wir uns im frühen Licht zum laotischen Morgenritual mit den Mönchen im Souphattra Heritage Vientiane. Mönche ziehen in Prozession, Reis wird gereicht, nichts wird eilig. Es ist ein laotischer Morgen — und er eröffnet den ganzen Tag.",
    "ก่อนวันแต่งงานจะเริ่ม เรารวมตัวกันในแสงเช้าตรู่เพื่อพิธีตักบาตรที่สุพัตรา เฮอริเทจ พระสงฆ์เดินบิณฑบาต ถวายข้าว อย่างไม่รีบร้อน นี่คือเช้าแบบลาว และเป็นการเปิดวันทั้งวัน",
    "式の一日が始まる前、朝の光の中で托鉢に集います。僧侶の列が進み、米が捧げられ、何も急がない。ラオスの朝が、この日全体を開きます。");
  E("As the day softens, everyone gathers at Souphattra Heritage Vientiane. Stillness, presence, and the vow spoken in front of the people who matter most.",
    "Wenn der Tag weicher wird, versammeln sich alle im Souphattra Heritage Vientiane. Stille, Gegenwart — und das Versprechen, gesprochen vor den Menschen, die am meisten bedeuten.",
    "เมื่อแสงแดดอ่อนลง ทุกคนมารวมกันที่สุพัตรา เฮอริเทจ ความสงบ การอยู่ตรงนั้น และคำสัญญาที่เอ่ยต่อหน้าคนสำคัญที่สุด",
    "日が和らぐころ、みなが集います。静けさと、その場に在ることと、大切な人々の前で交わされる誓い。");
  E("Sunset drinks beside the pool, then dinner in the courtyard garden: Lao food, music and a long, unhurried evening together.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten: laotisches Essen, Musik und ein langer, ruhiger Abend — gemeinsam.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์ตก แล้วต่อด้วยมื้อค่ำในสวน อาหารลาว ดนตรี และค่ำคืนที่งดงามร่วมกัน",
    "夕暮れのプールサイドで乾杯し、中庭でディナーを。ラオス料理と音楽とともに、穏やかな夜を分かち合います。");
  E("From sunset drinks beside the pool into the courtyard dinner.",
    "Von den Drinks am Pool bei Sonnenuntergang hinein in das Dinner im Hofgarten.",
    "จากเครื่องดื่มริมสระยามเย็น สู่มื้อค่ำในลานสวน",
    "夕暮れの乾杯から、中庭のディナーへ。");
  E("The most formal hour of the weekend, in the courtyard as the day softens.",
    "Die formellste Stunde des Wochenendes — im Innenhof, wenn der Tag weicher wird.",
    "ชั่วโมงที่เป็นทางการที่สุดของสุดสัปดาห์ ในลานบ้านยามแสงอ่อน",
    "週末で最も改まったひととき。日の和らぐ中庭で。");
  E("The participating temple will be announced with your itinerary. Your exact timing arrives in your Guest Area closer to the day.",
    "Der teilnehmende Tempel wird mit eurem Reiseplan bekannt gegeben. Eure genaue Zeit erhaltet ihr näher am Tag im Gästebereich.",
    "วัดที่ร่วมพิธีจะแจ้งพร้อมกำหนดการ เวลาที่แน่นอนจะส่งถึงส่วนสำหรับแขกเมื่อใกล้วันงาน",
    "参加寺院は旅程とともにお知らせします。正確な時間は、当日が近づいたらゲストエリアへ。");
  E("Timing and your table arrive in your Guest Area closer to the day.",
    "Zeit und Tisch erhaltet ihr näher am Tag im Gästebereich.",
    "เวลาและโต๊ะของคุณจะแจ้งในส่วนสำหรับแขกเมื่อใกล้วันงาน",
    "お時間とお席は、当日が近づいたらゲストエリアでご案内します。");
  E("Your exact arrival time and seat arrive in your Guest Area closer to the day.",
    "Eure genaue Ankunftszeit und euer Platz erhalten euch näher am Tag im Gästebereich.",
    "เวลามาถึงและที่นั่งของคุณจะแจ้งในส่วนสำหรับแขกเมื่อใกล้วันงาน",
    "正確な到着時刻とお席は、当日が近づいたらゲストエリアへ。");
  E("Four moments, with a dress note for each. Warm days, cooler evenings by the river; every dress note below is tied to its moment of the weekend.",
    "Vier Momente — mit einer Dress-Notiz zu jedem. Warme Tage, kühlere Abende am Fluss; jede Notiz unten gehört zu ihrem Moment des Wochenendes.",
    "สี่ช่วงเวลา พร้อมคำแนะนำการแต่งกายในแต่ละช่วง กลางวันอบอุ่น ค่ำคืนริมน้ำเย็นลง ทุกคำแนะนำผูกกับช่วงเวลาของมันเอง",
    "四つのひとときに、それぞれの装いのご案内。昼は暖かく、川辺の夜は涼しく——各ノートはその瞬間のためのものです。");
  E("A light wrap for the river air after dark", "Ein leichter Überwurf für die Flussluft nach Einbruch der Dunkelheit", "ผ้าคลุมบาง ๆ สำหรับลมริมน้ำยามค่ำ", "日暮れ後の川風に、軽い羽織りを");
  E("No full white — reserved for the bride", "Kein reines Weiß — der Braut vorbehalten", "งดชุดขาวล้วน สงวนไว้สำหรับเจ้าสาว", "全身白はご遠慮を——花嫁のための色です");
  E("Evening gown or elegant cocktail length formal", "Abendkleid oder elegantes knielanges Formal", "ชุดราตรียาวหรือเดรสค็อกเทลสุดหรู", "イブニングドレス、または上品なカクテル丈のフォーマル");
  E("Floor length gown or refined formal dress", "Bodenlanges Kleid oder edles formelles Kleid", "ชุดราตรียาวถึงพื้นหรือชุดฟอร์มัลประณีต", "床までのガウン、または洗練されたフォーマルドレス");
  E("Tuxedo, black bow tie, patent shoes", "Smoking, schwarze Fliege, Lackschuhe", "ทักซิโด้ หูกระต่ายดำ รองเท้าหนังแก้ว", "タキシード、黒の蝶ネクタイ、エナメルシューズ");
  E("Tuxedo; a velvet or ivory dinner jacket is welcome", "Smoking; ein Samt- oder Ivory-Dinnerjacket ist willkommen", "ทักซิโด้ แจ็กเก็ตกำมะหยี่หรือสีงาช้างก็งดงาม", "タキシード。ベルベットやアイボリーのディナージャケットも歓迎");
  E("Garden setting; a block heel travels better than a stiletto", "Gartensetting; ein Blockabsatz reist besser als ein Stiletto", "งานในสวน ส้นหนามั่นคงกว่าส้นเข็ม", "会場は庭。ピンヒールよりブロックヒールが安心です");
  E("Dress on arrival · Elegant Resort Wear", "Dress bei Ankunft · Elegante Resort-Garderobe", "การแต่งกายเมื่อมาถึง · ชุดรีสอร์ตหรู", "ご到着時の装い・エレガント・リゾートウェア");
  E("Dress · Black Tie", "Dress · Black Tie", "การแต่งกาย · แบล็กไท", "ドレスコード・ブラックタイ");
  E("Dress · Elegant Resort Wear", "Dress · Elegante Resort-Garderobe", "การแต่งกาย · ชุดรีสอร์ตหรู", "ドレスコード・エレガント・リゾートウェア");
  E("Dress · Lao Traditional Dress", "Dress · Traditionelle laotische Kleidung", "การแต่งกาย · ชุดลาวประเพณี", "ドレスコード・ラオス伝統衣装");
  E("to live", "leben", "เพื่อมีชีวิต", "生きること");
  E("to love", "lieben", "เพื่อรัก", "愛すること");
  E("to pray", "beten", "เพื่อภาวนา", "祈ること");
  E("The vow,", "Das Versprechen,", "คำสัญญา", "誓いは、");
  E("made public.", "öffentlich gemacht.", "ที่เอ่ยต่อหน้าทุกคน", "みなの前で。");
  E("Sunset, then", "Sonnenuntergang, dann", "อาทิตย์อัสดง แล้วต่อด้วย", "夕陽、そして");
  E("the long table.", "die lange Tafel.", "โต๊ะยาวของเรา", "長いテーブルへ。");
  E("alms.", "Almosen.", "ตักบาตร", "托鉢。");
  E("vow.", "Versprechen.", "คำสัญญา", "誓い。");
  E("dinner.", "Dinner.", "งานเลี้ยง", "ディナー。");
  E("opens the day.", "eröffnet den Tag.", "เปิดวันใหม่", "一日が開く。");
  E("A room that is part", "Ein Zimmer, das Teil", "ห้องที่เป็นส่วนหนึ่ง", "その部屋も");
  E("of the journey.", "der Reise ist.", "ของการเดินทาง", "旅の一部。");
  E("What to wear, day by day.", "Was ihr tragt.", "แต่งกายอย่างไรในแต่ละวัน", "何を着るか、日ごとに。");
  E("What to wear,", "Was ihr tragt,", "แต่งกายอย่างไร", "何を着るか、");
  E("day by day.", "Tag für Tag.", "ในแต่ละวัน", "日ごとに。");
  E("· First Class Sleeper from Krung Thep Aphiwat Central Terminal, waking in Nong Khai at 06:45", "· First Class Sleeper ab Krung Thep Aphiwat Central Terminal — Aufwachen in Nong Khai um 06:45", "· ตู้นอนชั้นหนึ่งจากสถานีกลางกรุงเทพอภิวัฒน์ ตื่นที่หนองคาย 06:45", "・クルンテープ・アピワット中央駅発ファーストクラス寝台、6:45にノーンカーイで目覚める");
  E("· Special Express No. 25 · Bangkok → Nong Khai", "· Special Express No. 25 · Bangkok → Nong Khai", "· รถด่วนพิเศษขบวนที่ 25 · กรุงเทพฯ → หนองคาย", "・特急25号・バンコク→ノーンカーイ");
  E("· a quiet Buddhist ritual to open the day", "· ein stilles buddhistisches Ritual zur Eröffnung des Tages", "· พิธีพุทธอันเงียบงามเพื่อเปิดวัน", "・一日を開く静かな仏教の儀式");
  E("· drinks by the pool, then dinner in the courtyard garden",
    "· Drinks am Pool, dann Dinner im Hofgarten",
    "· เครื่องดื่มริมสระ ต่อด้วยมื้อค่ำในสวน",
    "・プールサイドで乾杯、続いて中庭でディナー")
  E("· the vows, in front of everyone who matters", "· das Versprechen, vor allen, die zählen", "· คำสัญญา ต่อหน้าทุกคนที่สำคัญ", "・大切な人みんなの前での誓い");
  E("· via Bangkok and Nong Khai · met and transferred", "· über Bangkok und Nong Khai · empfangen und transferiert", "· ผ่านกรุงเทพฯ และหนองคาย · มีคนรอรับและส่งต่อ", "・バンコクとノーンカーイ経由・お出迎えと送迎付き");
  E("· LINE & WhatsApp QR in your Guest Area", "· LINE- & WhatsApp-QR im Gästebereich", "· QR ของ LINE และ WhatsApp ในส่วนสำหรับแขก", "・LINE/WhatsAppのQRはゲストエリアに");
  E("By overnight sleeper train — Special Express No. 25 — to Nong Khai, then across the border · route reference:", "Mit dem Nachtzug — Special Express No. 25 — nach Nong Khai, dann über die Grenze · Streckenreferenz:", "โดยรถไฟตู้นอน รถด่วนพิเศษขบวนที่ 25 สู่หนองคาย แล้วข้ามพรมแดน · อ้างอิงเส้นทาง:", "夜行寝台・特急25号でノーンカーイへ、そして国境越え・路線参照：");
  E("(for reading only — Guest Relations arranges the tickets)", "(nur zum Nachlesen — Guest Relations besorgt die Tickets)", "(สำหรับอ่านเท่านั้น ฝ่ายดูแลแขกจัดการตั๋วให้)", "（ご参考まで——切符はゲストリレーションズが手配します）");
  E("State Railway of Thailand", "Staatsbahn von Thailand", "การรถไฟแห่งประเทศไทย", "タイ国鉄");
  E("or LINE and WhatsApp via the codes in your Guest Area.", "oder LINE und WhatsApp über die Codes im Gästebereich.", "หรือ LINE และ WhatsApp ผ่านโค้ดในส่วนสำหรับแขก", "またはゲストエリアのコードからLINE・WhatsAppで。");
  E("“what can I expect?”", "„Was erwartet mich?“", "“ฉันจะได้พบอะไร?”", "「何が待っている？」");
  E("“what happens next?”", "„Was passiert als Nächstes?“", "“ต่อไปจะเป็นอย่างไร?”", "「次はどうなる？」");
  E("↑ Top", "↑ Nach oben", "↑ กลับด้านบน", "↑ トップへ");
  E("across the Mekong", "über den Mekong", "ข้ามแม่น้ำโขง", "メコンを越えて");
  E("see you in laos", "see you in laos", "แล้วพบกันที่ลาว", "シーユー・イン・ラオス");
  E("Friday, 26 Feb · 20:25 → 06:45", "Freitag, 26. Feb · 20:25 → 06:45", "ศุกร์ 26 ก.พ. · 20:25 → 06:45", "2月26日（金）20:25→6:45");
  E("Sunday, 28 Feb · 05:00 AM", "Sonntag, 28. Feb · 05:00 Uhr", "อาทิตย์ 28 ก.พ. · 05:00 น.", "2月28日（日）5:00");
  E("Sunday, 28 Feb · 04:30 PM", "Sonntag, 28. Feb · 16:30 Uhr", "อาทิตย์ 28 ก.พ. · 16:30 น.", "2月28日（日）16:30");
  E("Sunday, 28 Feb · 07:30 PM", "Sonntag, 28. Feb · 19:30 Uhr", "อาทิตย์ 28 ก.พ. · 19:30 น.", "2月28日（日）19:30");
  E("Sunday, 28 February 2027 · at dawn", "Sonntag, 28. Februar 2027 · im Morgengrauen", "อาทิตย์ 28 กุมภาพันธ์ 2027 · ยามรุ่งสาง", "2027年2月28日（日）夜明けに");
  E("Sunday, 28 February 2027 · Souphattra Heritage Vientiane", "Sonntag, 28. Februar 2027 · Souphattra Heritage Vientiane", "อาทิตย์ 28 กุมภาพันธ์ 2027 · สุพัตรา เฮอริเทจ เวียงจันทน์", "2027年2月28日（日）スパッタラ・ヘリテージ");
  E("27 February – 1 March 2027 · 2 nights", "27. Februar – 1. März 2027 · 2 Nächte", "27 กุมภาพันธ์ – 1 มีนาคม 2027 · 2 คืน", "2027年2月27日〜3月1日・2泊");
  E("27 February – 1 March 2027 · Vientiane, Laos", "27. Februar – 1. März 2027 · Vientiane, Laos", "27 กุมภาพันธ์ – 1 มีนาคม 2027 · เวียงจันทน์ ลาว", "2027年2月27日〜3月1日・ラオス、ビエンチャン");
  E("20:25 · Krung Thep Aphiwat", "20:25 · Krung Thep Aphiwat", "20:25 · กรุงเทพอภิวัฒน์", "20:25・クルンテープ・アピワット");
  E("06:45 · at the river", "06:45 · am Fluss", "06:45 · ริมแม่น้ำ", "6:45・川のほとり");
  E("10 hours 20 minutes · First Class Sleeper", "10 Stunden 20 Minuten · First Class Sleeper", "10 ชั่วโมง 20 นาที · ตู้นอนชั้นหนึ่ง", "10時間20分・ファーストクラス寝台");
  E("Connections are drawn as schematic journey lines over the real map · Bangkok → Nong Khai by overnight train · Vientiane → Kunming and Lijiang → Bangkok by flight",
    "Verbindungen sind als schematische Reiselinien über der echten Karte gezeichnet · Bangkok → Nong Khai mit dem Nachtzug · Vientiane → Kunming und Lijiang → Bangkok per Flug",
    "เส้นทางวาดเป็นเส้นเชิงสัญลักษณ์บนแผนที่จริง · กรุงเทพฯ → หนองคาย โดยรถไฟตู้นอน · เวียงจันทน์ → คุนหมิง และลี่เจียง → กรุงเทพฯ โดยเครื่องบิน",
    "実際の地図の上に旅の線を模式的に描いています・バンコク→ノーンカーイは夜行列車・ビエンチャン→昆明、麗江→バンコクは飛行機");
  E("Limited availability · personally coordinated by Guest Relations", "Begrenzt verfügbar · persönlich koordiniert von Guest Relations", "จำนวนจำกัด · ฝ่ายดูแลแขกประสานงานเป็นการส่วนตัว", "数に限りあり・ゲストリレーションズが直接調整");
  E("A limited number of complimentary private residence stays are also available.", "Eine begrenzte Zahl kostenfreier Privatresidenz-Aufenthalte ist ebenfalls verfügbar.", "ยังมีที่พักเรสซิเดนซ์ส่วนตัวไม่มีค่าใช้จ่ายจำนวนจำกัด", "数に限りある無料のプライベートレジデンス滞在もございます。");
  E("One unit only", "Nur eine Einheit", "มีเพียงยูนิตเดียว", "一戸のみ");
  E("Private residence", "Private Residenz", "เรสซิเดนซ์ส่วนตัว", "プライベートレジデンス");
  E("Sleeps up to 4", "Für bis zu 4 Personen", "รองรับได้ถึง 4 ท่าน", "最大4名まで");
  E("Two bedrooms", "Zwei Schlafzimmer", "สองห้องนอน", "ベッドルーム2室");
  E("Two bedrooms · king and twin", "Zwei Schlafzimmer · King und Twin", "สองห้องนอน · คิงและทวิน", "ベッドルーム2室・キングとツイン");
  E("Private bathrooms", "Eigene Bäder", "ห้องน้ำในตัว", "専用バスルーム");
  E("Shared living space", "Gemeinsamer Wohnraum", "พื้นที่นั่งเล่นร่วม", "共有リビング");
  E("High ceilings", "Hohe Decken", "เพดานสูง", "高い天井");
  E("Large balcony", "Großer Balkon", "ระเบียงกว้าง", "広いバルコニー");
  E("Air conditioning", "Klimaanlage", "เครื่องปรับอากาศ", "エアコン");
  E("Hot water", "Warmwasser", "น้ำอุ่น", "温水");
  E("Free parking", "Kostenfreies Parken", "ที่จอดรถฟรี", "無料駐車場");
  E("Refrigerator", "Kühlschrank", "ตู้เย็น", "冷蔵庫");
  E("Kettle & kitchenette", "Wasserkocher & Küchenzeile", "กาต้มน้ำและครัวขนาดเล็ก", "ケトル＆簡易キッチン");
  E("Dining table", "Esstisch", "โต๊ะอาหาร", "ダイニングテーブル");
  E("Washer & laundry area", "Waschmaschine & Waschbereich", "เครื่องซักผ้าและพื้นที่ซักล้าง", "洗濯機＆ランドリー");
  E("King or twin", "King oder Twin", "คิงหรือทวิน", "キングまたはツイン");
  E("1 King bed", "1 Kingbett", "เตียงคิง 1 เตียง", "キングベッド1台");
  E("Up to 2 adults · 1 child", "Bis zu 2 Erw. · 1 Kind", "สูงสุดผู้ใหญ่ 2 · เด็ก 1", "最大大人2名・子ども1名");
  E("Up to 4 adults", "Bis zu 4 Erwachsene", "สูงสุดผู้ใหญ่ 4 ท่าน", "最大大人4名");
  E("31 sq.m. · 1 King bed · 2 adults, 1 child · 1st–3rd floor", "31 m² · 1 Kingbett · 2 Erw., 1 Kind · 1.–3. Etage", "31 ตร.ม. · เตียงคิง · ผู้ใหญ่ 2 เด็ก 1 · ชั้น 1–3", "31㎡・キングベッド・大人2名子ども1名・1〜3階");
  E("37–44 sq.m. · King or twin · up to 2 adults, 1 child", "37–44 m² · King oder Twin · bis 2 Erw., 1 Kind", "37–44 ตร.ม. · คิงหรือทวิน · ผู้ใหญ่ 2 เด็ก 1", "37〜44㎡・キング/ツイン・大人2名子ども1名まで");
  E("49 sq.m. · 1 King bed · garden and pool views", "49 m² · 1 Kingbett · Garten- und Poolblick", "49 ตร.ม. · เตียงคิง · วิวสวนและสระ", "49㎡・キングベッド・ガーデン＆プールビュー");
  E("63 sq.m. · 1 King bed · two bathrooms · ground floor", "63 m² · 1 Kingbett · zwei Bäder · Erdgeschoss", "63 ตร.ม. · เตียงคิง · ห้องน้ำสองห้อง · ชั้นล่าง", "63㎡・キングベッド・バスルーム2つ・1階");
  E("66–75 sq.m. · living room under a high ceiling", "66–75 m² · Wohnraum unter hoher Decke", "66–75 ตร.ม. · ห้องนั่งเล่นเพดานสูง", "66〜75㎡・高天井のリビング");
  E("84 sq.m. · separate living area · long balcony", "84 m² · separater Wohnbereich · langer Balkon", "84 ตร.ม. · พื้นที่นั่งเล่นแยก · ระเบียงยาว", "84㎡・独立リビング・長いバルコニー");
  E("118 sq.m. · two bedrooms · shared living space", "118 m² · zwei Schlafzimmer · gemeinsamer Wohnraum", "118 ตร.ม. · สองห้องนอน · พื้นที่นั่งเล่นร่วม", "118㎡・ベッドルーム2室・共有リビング");

  /* ---- register shell / invitation closure (gate L1 findings) ---- */
  E("Your Invitation · See You In Laos", "Eure Einladung · See You In Laos", "บัตรเชิญของคุณ · See You In Laos", "ご招待状・See You In Laos");
  E("See You In Laos · Haruthai & Suthep · 28 February 2027 · Vientiane", "See You In Laos · Haruthai & Suthep · 28. Februar 2027 · Vientiane", "See You In Laos · หรุทัยและสุเทพ · 28 กุมภาพันธ์ 2027 · เวียงจันทน์", "See You In Laos・ハルタイ＆ステープ・2027年2月28日・ビエンチャン");
  E("Enter the private invitation code from your invitation letter — or simply open the personal link we sent you.",
    "Gebt den privaten Einladungscode aus eurem Einladungsbrief ein — oder öffnet einfach den persönlichen Link, den wir euch geschickt haben.",
    "กรอกรหัสบัตรเชิญส่วนตัวจากจดหมายเชิญ หรือเพียงเปิดลิงก์ส่วนตัวที่เราส่งให้คุณ",
    "招待状に記載のプライベートコードをご入力ください——お送りした個人リンクを開くだけでも結構です。");
  E("Invitation code", "Einladungscode", "รหัสบัตรเชิญ", "招待コード");
  E("Your invitation code", "Euer Einladungscode", "รหัสบัตรเชิญของคุณ", "ご招待コード");
  E("Find my invitation", "Meine Einladung finden", "ค้นหาบัตรเชิญของฉัน", "招待状を探す");
  E("Reopen your invitation", "Einladung erneut öffnen", "เปิดบัตรเชิญอีกครั้ง", "招待状をもう一度開く");
  E("We could not find that invitation code. Please use the private code from your invitation letter — or write to Guest Relations and we will help right away.",
    "Wir konnten diesen Einladungscode nicht finden. Bitte nutzt den privaten Code aus eurem Einladungsbrief — oder schreibt Guest Relations, wir helfen sofort.",
    "เราไม่พบรหัสบัตรเชิญนี้ โปรดใช้รหัสส่วนตัวจากจดหมายเชิญ หรือเขียนถึงฝ่ายดูแลแขก เราพร้อมช่วยทันที",
    "その招待コードが見つかりませんでした。招待状のプライベートコードをご利用ください——ゲストリレーションズにご連絡いただければすぐお手伝いします。");
  E("Lost your code? Write to", "Code verloren? Schreibt an", "รหัสหาย? เขียนถึง", "コードをお忘れですか？ご連絡先：");
  E("and Guest Relations will help right away. Your invitation details are never published on this page.",
    "und Guest Relations hilft sofort. Eure Einladungsdetails werden auf dieser Seite nie veröffentlicht.",
    "แล้วฝ่ายดูแลแขกจะช่วยทันที รายละเอียดบัตรเชิญของคุณจะไม่ถูกเผยแพร่บนหน้านี้",
    "ゲストリレーションズがすぐに対応します。ご招待の詳細がこのページに公開されることはありません。");
  E("Your journey, stay and wedding experience have been prepared for you.",
    "Eure Reise, euer Aufenthalt und die Tage, die wir mit euch teilen — alles ist für euch vorbereitet.",
    "การเดินทาง ที่พัก และประสบการณ์งานแต่ง ถูกเตรียมไว้เพื่อคุณแล้ว",
    "旅も滞在も、ウェディングの体験も——すべてあなたのために整えられています。");
  E("Everything here has been prepared around you: the journey, the wedding days in Vientiane, your stay, and the small comforts in between. A few quiet questions, and Guest Relations takes it from there.",
    "Alles hier ist um euch herum vorbereitet: die Reise, die Hochzeitstage in Vientiane, euer Aufenthalt und die kleinen Annehmlichkeiten dazwischen. Ein paar ruhige Fragen — den Rest übernimmt Guest Relations.",
    "ทุกอย่างที่นี่ถูกเตรียมไว้รอบตัวคุณ การเดินทาง วันงานในเวียงจันทน์ ที่พัก และความสะดวกเล็ก ๆ ระหว่างทาง เพียงตอบคำถามเบา ๆ ไม่กี่ข้อ ที่เหลือฝ่ายดูแลแขกจัดการให้",
    "ここにあるすべては、あなたを中心に準備されています。旅、ビエンチャンでの婚礼の日々、滞在、その合間の小さな心地よさ。静かな質問にいくつか答えるだけで、あとはゲストリレーションズにお任せを。");
  E("Join the journey.", "Werdet Teil der Reise.", "ร่วมเดินทางไปด้วยกัน", "旅にご参加ください。");
  E("Begin", "Beginnen", "เริ่มต้น", "はじめる");
  E("My journey", "Meine Reise", "เส้นทางของฉัน", "旅のしおり");
  E("Who are we", "Wen dürfen wir", "เราจะได้ต้อนรับ", "どなたを");
  E("welcoming?", "willkommen heißen?", "ใครบ้าง?", "お迎えするのでしょう？");
  E("You come", "Ihr kommt,", "คุณมาอย่างที่", "あなたは、");
  E("as you belong.", "wie ihr dazugehört.", "คุณเป็นส่วนหนึ่ง", "そのままで家族。");
  E("Each of you", "Jede und jeder von euch", "ทุกคนในกลุ่ม", "お一人おひとり");
  E("What you are", "Wofür ihr", "สิ่งที่คุณ", "あなたの");
  E("there for.", "da seid.", "มาเพื่อสิ่งนั้น", "楽しみのために。");
  E("The table is set", "Der Tisch ist gedeckt", "โต๊ะถูกจัดเตรียมไว้แล้ว", "食卓は整いました");
  E("Beautiful things are", "Etwas Schönes ist", "สิ่งงดงามกำลังจะ", "美しいことが、");
  E("about to happen", "im Begriff zu geschehen", "เกิดขึ้น", "はじまろうとしています");
  E("Clear, and", "Klar und", "ชัดเจน และ", "明快に、");
  E("kept simple.", "einfach gehalten.", "เรียบง่าย", "シンプルに。");
  E("at a glance.", "auf einen Blick.", "โดยสรุป", "ひと目で。");
  E("Spa & wellness", "Spa & Wellness", "สปาและเวลเนส", "スパ＆ウェルネス");
  E("Request an additional guest", "Einen zusätzlichen Gast anfragen", "ขอเพิ่มแขก", "追加ゲストをリクエスト");
  E("Who would you like to bring, and why?", "Wen möchtet ihr mitbringen — und warum?", "อยากพาใครมาด้วย และเพราะอะไร?", "どなたをお連れしたいですか？その理由も");
  E("Additional guests are reviewed by Guest Relations and become part of your invitation only after approval. Nothing changes automatically.",
    "Zusätzliche Gäste werden von Guest Relations geprüft und werden erst nach Freigabe Teil eurer Einladung. Nichts ändert sich automatisch.",
    "แขกเพิ่มเติมจะได้รับการพิจารณาโดยฝ่ายดูแลแขก และจะเป็นส่วนหนึ่งของบัตรเชิญเมื่อได้รับอนุมัติเท่านั้น ไม่มีอะไรเปลี่ยนโดยอัตโนมัติ",
    "追加ゲストはゲストリレーションズが確認し、承認後にはじめて招待に加わります。自動的に変わることはありません。");
  E("Dietary needs and allergies stay individual and reach only the kitchens that cook for you.",
    "Ernährungswünsche und Allergien bleiben individuell und erreichen nur die Küchen, die für euch kochen.",
    "ความต้องการด้านอาหารและภูมิแพ้เป็นเรื่องเฉพาะบุคคล และส่งถึงเฉพาะครัวที่ปรุงให้คุณเท่านั้น",
    "お食事のご希望とアレルギーは個別に扱われ、あなたのために調理する厨房にのみ届きます。");
  E("Send my registration", "Meine Registrierung senden", "ส่งการลงทะเบียนของฉัน", "登録を送信する");
  E("Send by email", "Per E-Mail senden", "ส่งทางอีเมล", "メールで送信");
  E("Copy for LINE", "Für LINE kopieren", "คัดลอกสำหรับ LINE", "LINE用にコピー");
  E("One message carries everything. Send it by email, or paste it into your LINE chat with Guest Relations (scan the code on your journey page).",
    "Eine Nachricht trägt alles. Sendet sie per E-Mail oder fügt sie in euren LINE-Chat mit Guest Relations ein (Code auf eurer Reiseseite scannen).",
    "ข้อความเดียวมีครบทุกอย่าง ส่งทางอีเมล หรือวางในแชท LINE กับฝ่ายดูแลแขก (สแกนโค้ดบนหน้าการเดินทางของคุณ)",
    "ひとつのメッセージにすべてが。メールで送るか、ゲストリレーションズとのLINEチャットに貼り付けてください（コードは旅のページに）。");
  E("Your registration has been received. Guest Relations will review your selections, availability and personal requirements, and you will be contacted with confirmations or any additional information.",
    "Eure Registrierung ist eingegangen. Guest Relations prüft eure Auswahl, Verfügbarkeiten und persönlichen Wünsche; ihr werdet mit Bestätigungen oder weiteren Informationen kontaktiert.",
    "ได้รับการลงทะเบียนของคุณแล้ว ฝ่ายดูแลแขกจะตรวจสอบตัวเลือก ห้องว่าง และความต้องการส่วนตัว แล้วติดต่อคุณพร้อมการยืนยันหรือข้อมูลเพิ่มเติม",
    "ご登録を受け付けました。ゲストリレーションズが選択内容・空き状況・ご要望を確認し、確定または追加のご案内をお届けします。");
  E("— Khun Ket and Khun Paddy confirm each arrangement with you personally.", "— Khun Ket und Khun Paddy bestätigen jedes Arrangement persönlich mit euch.", "— คุณเกตุและคุณแพดดี้ยืนยันทุกการจัดเตรียมกับคุณเป็นการส่วนตัว", "——クン・ケットとクン・パディが、ひとつひとつ直接ご確認します。");
  E("To Guest", "An Guest", "ถึงฝ่าย", "宛先：ゲスト");
  E("Reserved for Haruthai & Suthep", "Reserviert für Haruthai & Suthep", "สงวนไว้สำหรับหรุทัยและสุเทพ", "ハルタイ＆ステープのために確保");

  E("Sunday, 28 February 2027 · Vientiane", "Sonntag, 28. Februar 2027 · Vientiane", "อาทิตย์ 28 กุมภาพันธ์ 2027 · เวียงจันทน์", "2027年2月28日（日）ビエンチャン");
  E("the wedding", "die Hochzeit", "งานแต่งงาน", "結婚式");
  E("to travel", "reisen", "เพื่อเดินทาง", "旅すること");
  E("the", "das", "เดอะ", "ザ・");
  E("stay.", "Zimmer.", "ที่พัก", "滞在。");
  E("WiFi", "WLAN", "ไวไฟ", "Wi-Fi");
  E("Pantry", "Pantry", "แพนทรี", "パントリー");
  E("Bar", "Bar", "บาร์", "バー");
  E("Ground", "Erdgeschoss", "ชั้นล่าง", "1階");
  E("Pool and garden views", "Pool- und Gartenblick", "วิวสระและสวน", "プール＆ガーデンビュー");
  E("to be confirmed", "wird bestätigt", "รอยืนยัน", "追って確定");
  E("05:00 AM", "05:00 Uhr", "05:00 น.", "5:00");
  E("04:30 PM", "16:30 Uhr", "16:30 น.", "16:30");
  E("07:30 PM", "19:30 Uhr", "19:30 น.", "19:30");

  /* ---- §8 complete semantic units (register step headings + sentences) ---- */
  E("Your private journey.", "Eure private Reise.", "การเดินทางส่วนตัวของคุณ", "あなただけの旅。");
  E("The table is set around you.", "Der Tisch ist um euch herum gedeckt.", "โต๊ะถูกจัดเตรียมไว้รอบตัวคุณ", "食卓は、あなたを囲むように。");
  E("Your journey, at a glance.", "Eure Reise auf einen Blick.", "การเดินทางของคุณโดยสรุป", "旅を、ひと目で。");
  E("To Guest Relations.", "An Guest Relations.", "ส่งถึงฝ่ายดูแลแขก", "ゲストリレーションズへ。");
  E("Who are we welcoming?", "Wen dürfen wir willkommen heißen?", "เราจะได้ต้อนรับใครบ้าง", "どなたをお迎えするのでしょう？");
  E("Which roads bring you to us?", "Welche Wege führen euch zu uns?", "เส้นทางใดจะพาคุณมาหาเรา", "どの道があなたを届けてくれますか？");
  E("Getting you here and home.", "Ankommen und heimkehren.", "รับส่งคุณทั้งไปและกลับ", "行きも帰りも、安心して。");
  E("A slower hour, if you like.", "Eine langsamere Stunde, wenn ihr mögt.", "ชั่วโมงที่ช้าลง หากคุณต้องการ", "お望みなら、ゆったりとした時間を。");
  E("What you are there for.", "Wofür ihr da seid.", "สิ่งที่คุณมาเพื่อร่วม", "あなたが楽しみに来たもの。");
  E("Where you wake up.", "Wo ihr aufwacht.", "ที่ที่คุณจะตื่นนอน", "目覚める場所。");
  E("You come as you belong.", "Ihr kommt, wie ihr dazugehört.", "คุณมาอย่างที่คุณเป็นส่วนหนึ่ง", "そのままのあなたで、家族の一員。");
  E("Beautiful things are about to happen", "Etwas Schönes ist im Begriff zu geschehen", "สิ่งงดงามกำลังจะเกิดขึ้น", "美しいことが、はじまろうとしています");
  E("Clear, and kept simple.", "Klar und einfach gehalten.", "ชัดเจนและเรียบง่าย", "明快に、シンプルに。");
  E("Everything you send is a registration request — Khun Ket and Khun Paddy confirm each arrangement with you personally.",
    "Alles, was ihr sendet, ist eine Registrierungsanfrage — Khun Ket und Khun Paddy bestätigen jedes Arrangement persönlich mit euch.",
    "ทุกอย่างที่คุณส่งคือคำขอลงทะเบียน คุณเกตุและคุณแพดดี้จะยืนยันทุกการจัดเตรียมกับคุณเป็นการส่วนตัว",
    "お送りいただく内容はすべて登録リクエストです。ひとつひとつの手配は、クン・ケットとクン・パディが直接ご確認します。");

  /* ---- §12 accessibility strings ---- */
  E("Accommodation details", "Details zur Unterkunft", "รายละเอียดที่พัก", "宿泊の詳細");
  E("Back to the See You In Laos website", "Zurück zur See-You-In-Laos-Webseite", "กลับสู่เว็บไซต์ See You In Laos", "See You In Laosのサイトへ戻る");
  E("Back to the top", "Nach oben", "กลับด้านบน", "トップへ");
  E("Close invitation", "Einladung schließen", "ปิดบัตรเชิญ", "招待状を閉じる");
  E("Language", "Sprache", "ภาษา", "言語");
  E("Next photo", "Nächstes Foto", "ภาพถัดไป", "次の写真");
  E("Previous photo", "Vorheriges Foto", "ภาพก่อนหน้า", "前の写真");
  E("Photos", "Fotos", "ภาพถ่าย", "写真");
  E("Room gallery", "Zimmergalerie", "แกลเลอรีห้องพัก", "客室ギャラリー");
  E("Site", "Webseite", "เว็บไซต์", "サイト");
  E("Spa and wellness", "Spa und Wellness", "สปาและเวลเนส", "スパ＆ウェルネス");
  E("Send your registration", "Eure Registrierung senden", "ส่งการลงทะเบียนของคุณ", "登録を送信");
  E("Your events", "Eure Momente", "กิจกรรมของคุณ", "ご参加のセレモニー");
  E("Your guests", "Eure Gäste", "แขกของคุณ", "ゲストの皆さま");
  E("Your journey, reviewed", "Eure Reise im Überblick", "การเดินทางของคุณโดยละเอียด", "旅の最終確認");
  E("Your stay, Souphattra Heritage Vientiane", "Euer Aufenthalt, Souphattra Heritage Vientiane", "ที่พักของคุณ สุพัตรา เฮอริเทจ เวียงจันทน์", "ご滞在：スパッタラ・ヘリテージ");
  E("The alms giving, in Vientiane", "Das Morgenritual in Vientiane", "พิธีตักบาตรในเวียงจันทน์", "ビエンチャンでの托鉢の儀");
  E("The vow ceremony at Souphattra Heritage Vientiane", "Das Eheversprechen im Souphattra Heritage Vientiane", "พิธีกล่าวคำสัญญาที่สุพัตรา เฮอริเทจ", "スパッタラ・ヘリテージでの誓いの式");
  E("The wedding dinner at Souphattra Heritage Vientiane", "Das Hochzeitsdinner im Souphattra Heritage Vientiane", "งานเลี้ยงมงคลสมรสที่สุพัตรา เฮอริเทจ", "スパッタラ・ヘリテージでのウェディングディナー");
  E("Journey map: Bangkok, Nong Khai, Vientiane, Kunming, Lijiang and back to Bangkok", "Reisekarte: Bangkok, Nong Khai, Vientiane, Kunming, Lijiang und zurück nach Bangkok", "แผนที่การเดินทาง กรุงเทพฯ หนองคาย เวียงจันทน์ คุนหมิง ลี่เจียง และกลับกรุงเทพฯ", "旅の地図：バンコク、ノーンカーイ、ビエンチャン、昆明、麗江、そしてバンコクへ");
  E("Route map: Bangkok to Nong Khai overnight by Special Express No. 25, then across the Mekong to Vientiane", "Routenkarte: Bangkok nach Nong Khai über Nacht mit Special Express No. 25, dann über den Mekong nach Vientiane", "แผนที่เส้นทาง กรุงเทพฯ สู่หนองคายโดยรถด่วนพิเศษขบวนที่ 25 แล้วข้ามแม่น้ำโขงสู่เวียงจันทน์", "ルート図：特急25号で夜行にてノーンカーイへ、メコンを越えビエンチャンへ");

  E("Something did not load correctly just now — this is on our side, not your code. Please try again in a moment; if it continues, Guest Relations will help right away.",
    "Gerade hat etwas nicht richtig geladen — das liegt an uns, nicht an eurem Code. Bitte versucht es gleich noch einmal; falls es bestehen bleibt, hilft Guest Relations sofort.",
    "มีบางอย่างโหลดไม่สำเร็จ ซึ่งเป็นที่ระบบของเรา ไม่ใช่รหัสของคุณ โปรดลองอีกครั้งในอีกสักครู่ หากยังไม่ได้ ฝ่ายดูแลแขกพร้อมช่วยทันที",
    "ただいま読み込みに問題が発生しました——コードではなく、こちら側の問題です。少し置いてもう一度お試しください。続く場合はゲストリレーションズがすぐお手伝いします。");

  /* pattern rules for short composed nodes (statuses etc.) */
  var RXP = [
    { re: /^(\d+) of (\d+) available$/, f: { de: function (m) { return m[1] + ' von ' + m[2] + ' verfügbar'; }, th: function (m) { return 'ว่าง ' + m[1] + ' จาก ' + m[2]; }, ja: function (m) { return m[2] + '室中' + m[1] + '室空きあり'; } } },
    { re: /^(\d+) of (\d+) seats remaining$/, f: { de: function (m) { return m[1] + ' von ' + m[2] + ' Plätzen frei'; }, th: function (m) { return 'เหลือที่นั่ง ' + m[1] + ' จาก ' + m[2]; }, ja: function (m) { return m[2] + '席中' + m[1] + '席空き'; } } },
  ];
  RXP.push({ re: /^(Black Tie|Elegant Resort Wear|Lao Traditional Dress) dress reference (\d+), open larger$/, f: {
    de: function (m) { return ({'Black Tie':'Black Tie','Elegant Resort Wear':'Elegante Resort-Garderobe','Lao Traditional Dress':'Traditionelle laotische Kleidung'})[m[1]] + ' — Referenz ' + m[2] + ', größer öffnen'; },
    th: function (m) { return 'ภาพตัวอย่างการแต่งกาย ' + m[2] + ' — แตะเพื่อดูภาพใหญ่'; },
    ja: function (m) { return '装いの参考写真 ' + m[2] + '——タップで拡大'; } } });
  RXP.push({ re: /^(.+) photos — swipe, or press Enter for a larger view$/, f: {
    de: function (m) { return m[1] + ' — Fotos: wischen oder Enter für die große Ansicht'; },
    th: function (m) { return 'ภาพ ' + m[1] + ' — ปัดดู หรือกด Enter เพื่อดูภาพใหญ่'; },
    ja: function (m) { return m[1] + 'の写真——スワイプ、またはEnterで拡大表示'; } } });
  RXP.push({ re: /^([\d–-]+) sq\.m\.$/, f: { de: function (m) { return m[1] + ' m²'; }, th: function (m) { return m[1] + ' ตร.ม.'; }, ja: function (m) { return m[1] + '㎡'; } } });
  RXP.push({ re: /^(\d+) adults?(?: · (\d+) child(?:ren)?(?: sharing bedding)?)?$/, f: { de: function (m) { return m[1] + ' Erw.' + (m[2] ? ' · ' + m[2] + ' Kind' : ''); }, th: function (m) { return 'ผู้ใหญ่ ' + m[1] + (m[2] ? ' · เด็ก ' + m[2] : ''); }, ja: function (m) { return '大人' + m[1] + '名' + (m[2] ? '・子ども' + m[2] + '名' : ''); } } });
  RXP.push({ re: /^Up to (\d+) adults?(?: · (\d+) child(?:ren)?)?$/, f: { de: function (m) { return 'Bis zu ' + m[1] + ' Erw.' + (m[2] ? ' · ' + m[2] + ' Kind' : ''); }, th: function (m) { return 'สูงสุดผู้ใหญ่ ' + m[1] + (m[2] ? ' · เด็ก ' + m[2] : ''); }, ja: function (m) { return '最大大人' + m[1] + '名' + (m[2] ? '・子ども' + m[2] + '名' : ''); } } });
  RXP.push({ re: /^(\d+) rooms? allocated$/, f: { de: function (m) { return m[1] + ' Zimmer im Kontingent'; }, th: function (m) { return 'จัดสรร ' + m[1] + ' ห้อง'; }, ja: function (m) { return '割当' + m[1] + '室'; } } });
  RXP.push({ re: /^(\d+) seats? allocated$/, f: { de: function (m) { return m[1] + ' Plätze im Kontingent'; }, th: function (m) { return 'จัดสรร ' + m[1] + ' ที่นั่ง'; }, ja: function (m) { return '割当' + m[1] + '席'; } } });
  RXP.push({ re: /^(\d+) details? still needed$/, f: { de: function (m) { return m[1] + ' Angaben fehlen noch'; }, th: function (m) { return 'ยังขาดข้อมูล ' + m[1] + ' รายการ'; }, ja: function (m) { return 'あと' + m[1] + '件の入力が必要'; } } });
  /* composed runtime metas ("when · time · venue" etc.): translate segment
   * by segment, but only when EVERY segment resolves — otherwise leave the
   * node untouched (fail-closed, never mixed-language output). */
  RXP.push({ re: /^(.+ · .+)$/, f: (function () {
    function seg(lang) { return function (m) {
      var idx = LI[lang], parts = m[1].split(' · '), out = [];
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i].replace(/\s+/g, ' ').trim();
        if (!D[q]) return m[1];
        out.push(D[q][idx]);
      }
      return out.join(' · ');
    }; }
    return { de: seg('de'), th: seg('th'), ja: seg('ja') };
  })() });
  var PATTERNS = [
    { re: /\bper guest\b/g, de: "pro Gast", th: "ต่อท่าน", ja: "お一人につき" },
    { re: /\bper vehicle\b/g, de: "pro Fahrzeug", th: "ต่อคัน", ja: "1台につき" },
    { re: /\bnights?\b/g, de: "Nächte", th: "คืน", ja: "泊" },
    { re: /\bseats?\b/g, de: "Plätze", th: "ที่นั่ง", ja: "席" },
    { re: /\bREQUESTED\b/g, de: "ANGEFRAGT", th: "ส่งคำขอแล้ว", ja: "リクエスト済み" },
    { re: /\bUNDER REVIEW\b/g, de: "WIRD GERADE GEPRÜFT", th: "กำลังตรวจสอบ", ja: "確認中" },
    { re: /\bCONFIRMED\b/g, de: "BESTÄTIGT", th: "ยืนยันแล้ว", ja: "確定" },
  ];
  var LI = { de: 0, th: 1, ja: 2 };

  var originals = new Map();     // text node -> EN original
  /* §9: release validator reads these — a catalog-required string that stays
   * English under DE/TH/JA is recorded as a fallback invocation. */
  var MISSES = { de: {}, th: {}, ja: {} };
  function recordMiss(t) { if (lang !== 'en' && MISSES[lang]) MISSES[lang][t] = true; }
  function inCatalog(t) { return window.SIYL_CATALOG && window.SIYL_CATALOG.indexOf(t) > -1; }
  var headOriginals = new Map(); // split heading element -> original innerHTML

  var HEAD_SEL = '.split-h, .h-big, .ask, main.wrap section.step h2, main.wrap section.step .step-eyebrow';
  function translateHeadings() {
    document.querySelectorAll(HEAD_SEL).forEach(function (el) {
      if (!headOriginals.has(el)) headOriginals.set(el, el.innerHTML);
      var orig = headOriginals.get(el);
      // lines of the ORIGINAL heading (split spans stripped via a scratch node)
      var scratch = document.createElement('div');
      scratch.innerHTML = orig;
      var text = scratch.textContent;
      var lines;
      if (orig.indexOf('<br') > -1) {
        lines = orig.split(/<br[^>]*>/).map(function (h) {
          var d2 = document.createElement('div'); d2.innerHTML = h; return d2.textContent.trim();
        });
      } else {
        // GSAP SplitText may have replaced the <br> structure with .line divs
        // before the first language switch captured the "original" markup.
        var lineEls = scratch.querySelectorAll('.line');
        lines = lineEls.length > 1
          ? Array.prototype.map.call(lineEls, function (n) { return n.textContent.trim(); })
          : [text.trim()];
      }
      var idx = LI[lang];
      // §8: COMPLETE semantic unit first — the full phrase owns the translation;
      // per-line mapping is only the legacy fallback for line-pair headings.
      var full = lines.join(' ').replace(/\s+/g, ' ').trim();
      var mapped;
      if (D[full]) {
        mapped = [D[full][idx]]; // locale renders as one unit, wraps naturally
      } else {
        mapped = lines.map(function (ln) { return D[ln] ? D[ln][idx] : ln; });
      }
      if (mapped.join('') !== lines.join('')) {
        el.innerHTML = mapped.map(function (t) {
          return '<span style="display:inline-block">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>';
        }).join('<br/>');
      }
    });
  }
  function restoreHeadings() {
    headOriginals.forEach(function (html, el) { if (el.isConnected) el.innerHTML = html; });
  }

  function translateNode(node) {
    if (lang === 'en') return;
    var raw = originals.has(node) ? originals.get(node) : node.data;
    var trimmed = raw.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!trimmed) return;
    var idx = LI[lang];
    var out = null;
    if (D[trimmed]) {
      var lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
      out = lead + D[trimmed][idx] + tail;
    } else {
      for (var r = 0; r < RXP.length; r++) {
        var m = trimmed.match(RXP[r].re);
        if (m) { out = raw.replace(trimmed, RXP[r].f[lang](m)); break; }
      }
    }
    if (out === null && trimmed.length <= 80) {
      var t2 = raw, hit = false;
      for (var i = 0; i < PATTERNS.length; i++) {
        var p = PATTERNS[i];
        if (p.re.test(t2)) { t2 = t2.replace(p.re, p[lang]); hit = true; }
        p.re.lastIndex = 0;
      }
      if (hit) out = t2;
    }
    if (out !== null && out !== node.data) {
      if (!originals.has(node)) originals.set(node, raw);
      node.data = out;
    } else if (out === null && inCatalog(trimmed)) {
      recordMiss(trimmed); // required key rendered without a localized value
    }
  }

  function walk(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        return (p === 'SCRIPT' || p === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var n; var list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(translateNode);
  }

  function restoreAll() {
    originals.forEach(function (en, node) { if (node.isConnected) node.data = en; });
    originals = new Map();
  }

  /* §12: accessibility strings are localized from the same dictionary. */
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  var attrOriginals = new Map(); // el -> {attr: original}
  function translateAttrs(root) {
    var idx = LI[lang];
    ATTRS.forEach(function (attr) {
      (root.querySelectorAll ? root : document).querySelectorAll('[' + attr.replace(':', '\\:') + ']').forEach(function (el) {
        var store = attrOriginals.get(el) || {};
        var orig = store[attr] != null ? store[attr] : el.getAttribute(attr);
        var key = orig.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        var val = null;
        if (D[key]) { val = D[key][idx]; }
        else { for (var r = 0; r < RXP.length; r++) { var mm = key.match(RXP[r].re); if (mm) { val = RXP[r].f[lang](mm); break; } } }
        if (val != null) {
          if (store[attr] == null) { store[attr] = orig; attrOriginals.set(el, store); }
          el.setAttribute(attr, val);
        }
      });
    });
  }
  function restoreAttrs() {
    attrOriginals.forEach(function (store, el) {
      if (!el.isConnected) return;
      for (var attr in store) el.setAttribute(attr, store[attr]);
    });
    attrOriginals = new Map();
  }
  function apply() {
    document.documentElement.lang = lang;
    if (lang === 'en') { restoreAll(); restoreHeadings(); restoreAttrs(); return; }
    translateHeadings();
    walk(document.body);
    translateAttrs(document);
  }

  var pending = null;
  var mo = new MutationObserver(function () {
    if (lang === 'en') return;
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = null; walk(document.body); translateAttrs(document); });
  });

  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === lang) return;
    restoreAll(); restoreHeadings(); restoreAttrs();
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang-btn') === l);
    });
  }

  window.SIYL_I18N = {
    get lang() { return lang; },
    misses: function () { return { de: Object.keys(MISSES.de), th: Object.keys(MISSES.th), ja: Object.keys(MISSES.ja) }; },
    resetMisses: function () { MISSES = { de: {}, th: {}, ja: {} }; },
    setLang: setLang,
    t: function (s) { var e = D[s]; return (lang === 'en' || !e) ? s : (e[LI[lang]] || s); },
    add: function (entries) { for (var k in entries) D[k] = entries[k]; if (lang !== 'en') walk(document.body); },
  };

  if (lang !== 'en') { document.documentElement.style.visibility = 'hidden'; }
  function firstApply() {
    apply();
    document.documentElement.style.visibility = '';
  }
  if (document.readyState !== 'loading') { firstApply(); }
  document.addEventListener('DOMContentLoaded', function () {
    firstApply();
    mo.observe(document.body, { childList: true, subtree: true, characterData: false });
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang-btn') === lang);
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang-btn')); });
    });
  });
})();
