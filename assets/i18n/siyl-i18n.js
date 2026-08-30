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
  E("UNDER REVIEW", "IN PRÜFUNG", "กำลังตรวจสอบ", "確認中");
  E("CONFIRMED", "BESTÄTIGT", "ยืนยันแล้ว", "確定");
  E("WAITLISTED", "WARTELISTE", "อยู่ในรายชื่อรอ", "キャンセル待ち");
  E("Continue", "Weiter", "ดำเนินการต่อ", "次へ");
  E("Back", "Zurück", "ย้อนกลับ", "戻る");
  E("Save", "Speichern", "บันทึก", "保存");
  E("Saved", "Gespeichert", "บันทึกแล้ว", "保存しました");
  E("Log out", "Abmelden", "ออกจากระบบ", "ログアウト");
  E("Website", "Webseite", "เว็บไซต์", "ウェブサイト");
  E("Invitation", "Einladung", "บัตรเชิญ", "招待状");
  E("View details", "Details ansehen", "ดูรายละเอียด", "詳細を見る");
  E("Hide details", "Details schließen", "ซ่อนรายละเอียด", "詳細を閉じる");
  E("Compare", "Vergleichen", "เปรียบเทียบ", "比較");
  E("Compare rooms", "Zimmer vergleichen", "เปรียบเทียบห้องพัก", "客室を比較");
  E("Edit", "Bearbeiten", "แก้ไข", "編集");
  E("Review", "Überblick", "ตรวจทาน", "確認");
  E("Send", "Senden", "ส่ง", "送信");
  E("Close", "Schließen", "ปิด", "閉じる");
  E("Guest Relations will confirm the arrangement", "Guest Relations bestätigt die Abstimmung persönlich", "ฝ่ายดูแลแขกจะยืนยันการจัดเตรียมให้", "ゲストリレーションズが手配を確定します");
  E("To finalize with Guest Relations", "Mit Guest Relations abzustimmen", "รอสรุปกับฝ่ายดูแลแขก", "ゲストリレーションズと最終調整");
  E("Total contribution", "Gesamtbeitrag", "ยอดร่วมสมทบทั้งหมด", "ご負担額合計");
  E("Hosted for you", "Für euch übernommen", "ของขวัญจากเจ้าภาพ", "おもてなしとしてご招待");
  E("Your journey", "Eure Reise", "การเดินทางของคุณ", "旅の概要");
  E("Your route", "Eure Route", "เส้นทางของคุณ", "ルート");

  /* ---- private navigation ---- */
  E("My Journey", "Meine Reise", "การเดินทางของฉัน", "マイジャーニー");
  E("My Travel", "Meine Anreise", "การเดินทาง", "交通");
  E("My Stay", "Mein Zimmer", "ที่พักของฉัน", "宿泊");
  E("My Wedding", "Meine Hochzeit", "งานแต่งของฉัน", "ウェディング");
  E("My Profile", "Mein Profil", "โปรไฟล์ของฉัน", "プロフィール");
  E("My Contribution", "Mein Beitrag", "ยอดร่วมสมทบ", "ご負担額");

  /* ---- public navigation / chrome ---- */
  E("Journey", "Die Reise", "การเดินทาง", "旅");
  E("Stay", "Übernachten", "ที่พัก", "滞在");
  E("Wedding", "Hochzeit", "งานแต่งงาน", "挙式");
  E("Travel", "Anreise", "ข้อมูลเดินทาง", "交通案内");
  E("Guest Area", "Gästebereich", "พื้นที่สำหรับแขก", "ゲストエリア");
  E("MENU", "MENÜ", "เมนู", "メニュー");
  E("TOP", "NACH OBEN", "ขึ้นบน", "トップへ");
  E("join the journey", "Teil der Reise werden", "ร่วมเดินทางไปกับเรา", "旅に参加する");

  /* ---- public sections ---- */
  E("The Moments", "Die Momente", "ช่วงเวลาสำคัญ", "セレモニー");
  E("The Journey Map", "Die Reisekarte", "แผนที่การเดินทาง", "旅の地図");
  E("The Places", "Die Orte", "สถานที่", "会場");
  E("The Weekend, in Order", "Das Wochenende, der Reihe nach", "ลำดับวันงาน", "当日の流れ");
  E("Before You Travel", "Vor der Reise", "ก่อนออกเดินทาง", "ご出発前に");
  E("Next Steps", "Die nächsten Schritte", "ขั้นตอนถัดไป", "次のステップ");
  E("Your Guest Area", "Euer Gästebereich", "พื้นที่สำหรับแขกของคุณ", "ゲストエリア");
  E("The Pre Wedding Journey", "Die Reise vor der Hochzeit", "การเดินทางก่อนวันงาน", "ウェディング前の旅");
  E("The Alms Giving", "Die Almosengabe", "พิธีตักบาตร", "托鉢の儀");
  E("The Vow Ceremony", "Das Eheversprechen", "พิธีกล่าวคำสัญญา", "誓いの式");
  E("The Wedding Dinner", "Das Hochzeitsdinner", "งานเลี้ยงฉลองมงคลสมรส", "ウェディングディナー");
  E("Alms Giving", "Almosengabe", "พิธีตักบาตร", "托鉢の儀");
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
  E("Your journey is with Guest Relations", "Eure Reise liegt bei Guest Relations", "การเดินทางของคุณอยู่ในมือฝ่ายดูแลแขก", "旅の手配はゲストリレーションズへ");
  E("We’re taking care of", "Darum kümmern wir uns", "เราดูแลให้ทั้งหมดนี้", "私たちにお任せください");
  E("Return to your journey", "Zurück zu eurer Reise", "กลับไปที่การเดินทางของคุณ", "旅の画面に戻る");

  /* ---- MY TRAVEL ---- */
  E("How would you like to travel to Vientiane?", "Wie möchtet ihr nach Vientiane reisen?", "คุณอยากเดินทางไปเวียงจันทน์อย่างไร", "ビエンチャンへはどのように向かいますか？");
  E("Choose the way that suits you — selecting one quietly sets the other aside.", "Wählt den Weg, der zu euch passt — die Wahl des einen legt den anderen still beiseite.", "เลือกแบบที่เหมาะกับคุณ เมื่อเลือกอย่างหนึ่ง อีกอย่างจะถูกพักไว้ให้เอง", "ご都合に合う方をお選びください。一方を選ぶと、もう一方は自然に外れます。");
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
  E("Add to journey", "Zur Reise hinzufügen", "เพิ่มในการเดินทาง", "旅に追加");
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
  E("Contribution", "Beitrag", "ยอดร่วมสมทบ", "ご負担額");
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
  E("Join the moments that feel right for you. We simply want you there in the way that works best for you.", "Seid bei den Momenten dabei, die sich für euch richtig anfühlen. Wir wünschen uns euch einfach so dabei, wie es für euch am besten passt.", "ร่วมเฉพาะช่วงเวลาที่ใช่สำหรับคุณ เราแค่อยากให้คุณอยู่ตรงนั้นในแบบที่เหมาะกับคุณที่สุด", "心地よいと感じる時間にご参加ください。あなたに合ったかたちで、そこにいてくださることが何よりの願いです。");
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
  E("Your contribution reads as your journey: what you pay, when it happens. Everything else is hosted for you.", "Euer Beitrag liest sich wie eure Reise: was ihr zahlt und wann es stattfindet. Alles andere ist für euch übernommen.", "ยอดร่วมสมทบของคุณอ่านได้เหมือนเส้นทางเดินทาง สิ่งที่คุณจ่ายและช่วงเวลาที่เกิดขึ้น ส่วนที่เหลือเจ้าภาพดูแลให้ทั้งหมด", "ご負担額は旅の行程そのもの。お支払いいただく内容と、その日程です。それ以外はすべて、おもてなしとしてご用意しています。");
  E("Pre-Wedding Journey", "Reise vor der Hochzeit", "การเดินทางก่อนวันงาน", "ウェディング前の旅");
  E("The Wedding", "Die Hochzeit", "งานแต่งงาน", "ウェディング");
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
  E("The Weekend, in Order", "Das Wochenende, der Reihe nach", "ลำดับวันงาน", "当日の流れ");
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
  E("Sunset drinks beside the pool, then dinner in the courtyard garden. Lao food, music and celebration, together late into the night.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten. Laotisches Essen, Musik und Feiern — gemeinsam bis tief in die Nacht.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์อัสดง แล้วต่อด้วยมื้อค่ำในสวนลานบ้าน อาหารลาว เสียงดนตรี และการเฉลิมฉลองด้วยกันจนดึก",
    "夕暮れ、プールサイドでの乾杯。続いて中庭でのディナー。ラオス料理と音楽と祝祭を、夜が更けるまで共に。");
  E("Souphattra Heritage Vientiane sits at the heart of our wedding stay: shared mornings, shared arrivals, and the rhythm of the weekend centred around one quiet place. Choose the stay that feels right for you.",
    "Das Souphattra Heritage Vientiane ist das Herz unseres Hochzeitsaufenthalts: gemeinsame Morgen, gemeinsame Ankünfte und der Rhythmus des Wochenendes um einen stillen Ort. Wählt den Aufenthalt, der sich für euch richtig anfühlt.",
    "สุพัตรา เฮอริเทจ เวียงจันทน์ คือหัวใจของการพักในงานแต่งของเรา เช้าที่แบ่งปันกัน การมาถึงพร้อมกัน และจังหวะของสุดสัปดาห์ที่หมุนรอบสถานที่อันเงียบสงบแห่งเดียว เลือกที่พักที่ใช่สำหรับคุณ",
    "スパッタラ・ヘリテージ・ビエンチャンは、この結婚式の滞在の中心。共に迎える朝、共にたどり着く時間、静かなひとつの場所を巡る週末のリズム。あなたに合う滞在をお選びください。");
  E("For rooms at Souphattra Heritage Vientiane, the amount shown is your total contribution per guest for the confirmed two-night stay: the first night is your guest contribution; the second night is hosted by",
    "Für Zimmer im Souphattra Heritage Vientiane ist der angezeigte Betrag euer Gesamtbeitrag pro Gast für den bestätigten Aufenthalt von zwei Nächten: Die erste Nacht ist euer Gastbeitrag; die zweite Nacht übernehmen",
    "สำหรับห้องพักที่สุพัตรา เฮอริเทจ เวียงจันทน์ จำนวนที่แสดงคือยอดร่วมสมทบต่อท่านสำหรับการพักสองคืนที่ยืนยันแล้ว คืนแรกคือส่วนร่วมของคุณ ส่วนคืนที่สองเป็นของขวัญจาก",
    "スパッタラ・ヘリテージの客室について、表示額は確定2泊分のお一人あたりのご負担額です。1泊目はゲストのご負担、2泊目はご招待——");
  E("Breakfast is included on both mornings. A limited number of complimentary alternative stays are also available.",
    "Frühstück ist an beiden Morgen inklusive. Eine begrenzte Zahl kostenfreier Alternativ-Unterkünfte ist ebenfalls verfügbar.",
    "รวมอาหารเช้าทั้งสองวัน และยังมีที่พักทางเลือกแบบไม่มีค่าใช้จ่ายจำนวนจำกัด",
    "両日の朝食付き。数に限りのある無料のオルタナティブステイもご用意しています。");
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
  E("Sunset drinks beside the pool, then dinner in the courtyard garden. Food, music and celebration.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten. Essen, Musik und Feiern.",
    "จิบเครื่องดื่มริมสระยามเย็น แล้วต่อด้วยมื้อค่ำในสวน อาหาร ดนตรี และการเฉลิมฉลอง",
    "夕暮れのプールサイドで乾杯、そして中庭でのディナー。料理と音楽とお祝いのひととき。");
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
  E("First night · your contribution — second night · hosted", "Erste Nacht · euer Beitrag — zweite Nacht · übernommen", "คืนแรก · ส่วนร่วมของคุณ — คืนที่สอง · เจ้าภาพดูแล", "1泊目・ご負担 — 2泊目・ご招待");
  E("Choose under My Stay", "Unter „Mein Zimmer“ wählen", "เลือกได้ที่ ที่พักของฉัน", "「宿泊」からお選びください");
  E("Join under My Travel", "Unter „Meine Anreise“ beitreten", "เข้าร่วมได้ที่ การเดินทาง", "「交通」からご参加ください");
  E("Choose under My Travel", "Unter „Meine Anreise“ wählen", "เลือกได้ที่ การเดินทาง", "「交通」からお選びください");
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
    "Warme Tage und kühlere Morgen am Fluss. Bringt eine leichte Schicht für die Almosengabe im Morgengrauen mit.",
    "กลางวันอบอุ่น เช้าริมแม่น้ำเย็นสบาย เตรียมเสื้อคลุมบาง ๆ สำหรับพิธีตักบาตรยามรุ่งสาง",
    "昼は暖かく、川辺の朝は涼しめ。夜明けの托鉢には薄手の羽織りをご用意ください。");
  E("dry season", "Trockenzeit", "ฤดูแล้ง", "乾季");
  E("Your contacts", "Eure Ansprechpartner", "ช่องทางติดต่อ", "お問い合わせ先");
  E("Getting there", "Anreise", "การเดินทางไป", "アクセス");
  E("Weather in late February", "Wetter Ende Februar", "อากาศปลายเดือนกุมภาพันธ์", "2月下旬の気候");
  E("Visa & currency", "Visum & Währung", "วีซ่าและสกุลเงิน", "ビザと通貨");
  E("Extend your journey", "Verlängert eure Reise", "ต่อการเดินทางของคุณ", "旅を延ばして");

  /* pattern rules for short composed nodes (statuses etc.) */
  var PATTERNS = [
    { re: /\bper guest\b/g, de: "pro Gast", th: "ต่อท่าน", ja: "お一人につき" },
    { re: /\bper vehicle\b/g, de: "pro Fahrzeug", th: "ต่อคัน", ja: "1台につき" },
    { re: /\bnights?\b/g, de: "Nächte", th: "คืน", ja: "泊" },
    { re: /\bseats?\b/g, de: "Plätze", th: "ที่นั่ง", ja: "席" },
    { re: /\bREQUESTED\b/g, de: "ANGEFRAGT", th: "ส่งคำขอแล้ว", ja: "リクエスト済み" },
    { re: /\bUNDER REVIEW\b/g, de: "IN PRÜFUNG", th: "กำลังตรวจสอบ", ja: "確認中" },
    { re: /\bCONFIRMED\b/g, de: "BESTÄTIGT", th: "ยืนยันแล้ว", ja: "確定" },
  ];
  var LI = { de: 0, th: 1, ja: 2 };

  var originals = new Map();     // text node -> EN original
  var headOriginals = new Map(); // split heading element -> original innerHTML

  var HEAD_SEL = '.split-h, .h-big, .ask';
  function translateHeadings() {
    document.querySelectorAll(HEAD_SEL).forEach(function (el) {
      if (!headOriginals.has(el)) headOriginals.set(el, el.innerHTML);
      var orig = headOriginals.get(el);
      // lines of the ORIGINAL heading (split spans stripped via a scratch node)
      var scratch = document.createElement('div');
      scratch.innerHTML = orig;
      var text = scratch.textContent;
      var lines = orig.indexOf('<br') > -1 ? orig.split(/<br[^>]*>/).map(function (h) {
        var d2 = document.createElement('div'); d2.innerHTML = h; return d2.textContent.trim();
      }) : [text.trim()];
      var idx = LI[lang];
      var mapped = lines.map(function (ln) { return D[ln] ? D[ln][idx] : ln; });
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
    var trimmed = raw.trim();
    if (!trimmed) return;
    var idx = LI[lang];
    var out = null;
    if (D[trimmed]) {
      out = raw.replace(trimmed, D[trimmed][idx]);
    } else if (trimmed.length <= 80) {
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

  function apply() {
    document.documentElement.lang = lang;
    if (lang === 'en') { restoreAll(); restoreHeadings(); return; }
    translateHeadings();
    walk(document.body);
  }

  var pending = null;
  var mo = new MutationObserver(function () {
    if (lang === 'en') return;
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = null; walk(document.body); });
  });

  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === lang) return;
    restoreAll(); restoreHeadings();
    lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    apply();
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang-btn') === l);
    });
  }

  window.SIYL_I18N = {
    get lang() { return lang; },
    setLang: setLang,
    t: function (s) { var e = D[s]; return (lang === 'en' || !e) ? s : (e[LI[lang]] || s); },
    add: function (entries) { for (var k in entries) D[k] = entries[k]; if (lang !== 'en') walk(document.body); },
  };

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    mo.observe(document.body, { childList: true, subtree: true, characterData: false });
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang-btn') === lang);
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang-btn')); });
    });
  });
})();
