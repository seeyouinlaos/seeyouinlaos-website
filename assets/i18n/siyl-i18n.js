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
  E("Everything is in place. Review your journey and send it to Guest Relations.", "Alles ist bereit. Prüft eure Reise und sendet sie an Guest Relations.", "ทุกอย่างพร้อมแล้ว ตรวจทานการเดินทางของคุณและส่งให้ฝ่ายดูแลแขก", "すべて整いました。旅程を確認し、ゲストリレーションズへお送りください。");
  E("Your registration is with Guest Relations. Khun Ket and Khun Paddy personally review every detail. Your private area stays open while they prepare your arrangements; no action is needed from you.",
    "Eure Registrierung liegt bei Guest Relations. Khun Ket und Khun Paddy prüfen jedes Detail persönlich. Euer privater Bereich bleibt offen, während sie eure Arrangements vorbereiten; ihr müsst nichts weiter tun.",
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
    "Abholung und Transfers sind Anfragen — der Status wandert von ANGEFRAGT über IN PRÜFUNG zu BESTÄTIGT, während Guest Relations koordiniert.",
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
  E("First night · guest contribution", "Erste Nacht · Gastbeitrag", "คืนแรก · ส่วนร่วมของแขก", "1泊目・ゲストのご負担");
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
  E("Your Contribution", "Euer Beitrag", "ยอดร่วมสมทบของคุณ", "ご負担額");
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
  E("Dress code not yet confirmed — please confirm under My Wedding", "Dresscode noch nicht bestätigt — bitte unter „Meine Hochzeit“ bestätigen", "ยังไม่ได้ยืนยันการแต่งกาย โปรดยืนยันที่ งานแต่งของฉัน", "ドレスコード未確認——「ウェディング」でご確認ください");
  E("Allergy · None reported", "Allergie · keine gemeldet", "ภูมิแพ้ · ไม่มีรายงาน", "アレルギー・報告なし");
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
    "Ab hier liegt alles in unseren Händen. Khun Ket und Khun Paddy prüfen eure Reisedaten, bestätigen eure Unterkunft, koordinieren eure Transfers und bereiten eure persönliche Reise vor. Euer privater Bereich bleibt die ganze Zeit offen; ihr müsst nichts weiter tun.",
    "จากนี้ไปทุกอย่างอยู่ในมือเรา คุณเกตุและคุณแพดดี้ตรวจข้อมูลการเดินทาง ยืนยันที่พัก ประสานการรับส่ง และเตรียมการเดินทางส่วนตัวของคุณ พื้นที่ส่วนตัวเปิดอยู่ตลอด คุณไม่ต้องทำอะไรเพิ่ม",
    "ここから先はすべてお任せください。クン・ケットとクン・パディが旅の情報を確認し、宿泊を確定し、送迎を調整し、あなたの旅を整えます。プライベートエリアは常に開いたまま——ご対応は不要です。");
  E("We’re taking care of", "Darum kümmern wir uns", "เราดูแลให้ทั้งหมดนี้", "私たちが承ります");
  E("Every REQUESTED selection above — seats, rooms, transfers and the wedding days — is now personally coordinated by Khun Ket and Khun Paddy. Statuses move from REQUESTED to UNDER REVIEW to CONFIRMED; nothing is booked until Guest Relations confirms it with you.",
    "Jede oben ANGEFRAGTE Auswahl — Plätze, Zimmer, Transfers und die Hochzeitstage — wird jetzt persönlich von Khun Ket und Khun Paddy koordiniert. Der Status wandert von ANGEFRAGT über IN PRÜFUNG zu BESTÄTIGT; nichts ist gebucht, bis Guest Relations es mit euch bestätigt.",
    "ทุกรายการที่ส่งคำขอด้านบน ทั้งที่นั่ง ห้องพัก การรับส่ง และวันงานแต่ง คุณเกตุและคุณแพดดี้จะประสานงานด้วยตนเอง สถานะจะเปลี่ยนจาก ส่งคำขอแล้ว เป็น กำลังตรวจสอบ และ ยืนยันแล้ว จะยังไม่มีการจองจนกว่าฝ่ายดูแลแขกยืนยันกับคุณ",
    "上記のリクエスト——お席、お部屋、送迎、婚礼の日々——は、クン・ケットとクン・パディが直接調整します。ステータスはリクエスト済み→確認中→確定と進み、ゲストリレーションズの確定までは予約は成立しません。");

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
  E("Sunset drinks beside the pool, then dinner in the courtyard garden. Lao food, music and celebration.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten. Laotisches Essen, Musik und Feiern.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์ตก แล้วต่อด้วยมื้อค่ำในสวน อาหารลาว ดนตรี และการเฉลิมฉลอง",
    "夕暮れのプールサイドで乾杯し、中庭でディナーを。ラオス料理と音楽と祝祭。");
  E("One complete glance at the weekend, from the moment you land to the last slow goodbye. A table is always set. The key moments of the wedding journey are arranged for you, with Guest Relations coordinating the transfers connected to your plans.",
    "Das ganze Wochenende auf einen Blick — von der Landung bis zum letzten langsamen Abschied. Ein Tisch ist immer gedeckt. Die Schlüsselmomente der Hochzeitsreise sind für euch arrangiert; Guest Relations koordiniert die Transfers zu euren Plänen.",
    "สุดสัปดาห์ทั้งหมดในหนึ่งสายตา ตั้งแต่วินาทีที่คุณลงเครื่องจนถึงคำอำลาช้า ๆ ครั้งสุดท้าย โต๊ะอาหารพร้อมเสมอ ช่วงเวลาสำคัญของการเดินทางถูกจัดเตรียมไว้ให้ โดยฝ่ายดูแลแขกประสานการรับส่งตามแผนของคุณ",
    "着陸の瞬間から最後のゆっくりとした別れまで、週末のすべてをひと目で。食卓はいつも整っています。旅の要となる瞬間はすべて手配済み——送迎はゲストリレーションズがご予定に合わせて調整します。");
  E("the key moments are arranged for you", "die Schlüsselmomente sind für euch arrangiert", "ช่วงเวลาสำคัญถูกจัดเตรียมไว้ให้คุณ", "大切な瞬間はすべて手配済み");
  E("full timings follow in your Guest Area", "die genauen Zeiten folgen in eurem Gästebereich", "เวลาโดยละเอียดจะแจ้งในพื้นที่สำหรับแขก", "詳しい時間はゲストエリアでご案内");
  E("Only your private pickup times and meeting points arrive later in", "Nur eure privaten Abholzeiten und Treffpunkte folgen später in", "เฉพาะเวลารับส่วนตัวและจุดนัดพบจะแจ้งภายหลังใน", "お迎え時刻と集合場所のみ、後ほどこちらでご案内：");
  E("your Guest Area", "eurem Gästebereich", "พื้นที่สำหรับแขกของคุณ", "ゲストエリア");
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
    "Das Souphattra Heritage Vientiane ist das Herz des Hochzeitsaufenthalts. Bei Hotelzimmern ist die erste Nacht euer Gastbeitrag, die zweite Nacht wird übernommen — mit Frühstück an beiden Morgen. Die Zimmer sind begrenzt:",
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
  E("Before you travel, write to", "Schreibt vor der Reise an", "ก่อนเดินทาง เขียนถึง", "ご出発前にご連絡を：");
  E("or message us on LINE or WhatsApp — scan the codes in your Guest Area. Your Guest Relations contacts are Khun Ket and Khun Paddy.",
    "oder schreibt uns über LINE oder WhatsApp — scannt die Codes in eurem Gästebereich. Eure Ansprechpartner bei Guest Relations sind Khun Ket und Khun Paddy.",
    "หรือส่งข้อความทาง LINE หรือ WhatsApp สแกนโค้ดในพื้นที่สำหรับแขก ผู้ดูแลของคุณคือคุณเกตุและคุณแพดดี้",
    "またはLINE・WhatsAppでどうぞ——コードはゲストエリアに。担当はクン・ケットとクン・パディです。");
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
  E("Your Guest Area answers", "Euer Gästebereich beantwortet", "พื้นที่สำหรับแขกตอบคำถาม", "ゲストエリアが答えるのは");
  E("Open your invitation, choose your journey, and Guest Relations takes it from there.",
    "Öffnet eure Einladung, wählt eure Reise — den Rest übernimmt Guest Relations.",
    "เปิดบัตรเชิญ เลือกการเดินทาง แล้วฝ่ายดูแลแขกดูแลต่อจากนั้น",
    "招待状を開き、旅を選べば、あとはゲストリレーションズにお任せ。");
  E("Contact", "Kontakt", "ติดต่อ", "お問い合わせ");
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
  E("Alms Giving · at dawn", "Almosengabe · im Morgengrauen", "พิธีตักบาตร · ยามรุ่งสาง", "托鉢の儀・夜明けに");
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
  E("LINE & WhatsApp QR in your Guest Area", "LINE- & WhatsApp-QR in eurem Gästebereich", "QR ของ LINE และ WhatsApp อยู่ในพื้นที่สำหรับแขก", "LINE・WhatsAppのQRはゲストエリアに");
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
    "Almosengabe 05:00 Uhr · Eheversprechen 16:30 Uhr · Hochzeitsdinner 19:30 Uhr · Souphattra Heritage Vientiane",
    "ตักบาตร 05:00 น. · พิธีกล่าวคำสัญญา 16:30 น. · งานเลี้ยงมงคลสมรส 19:30 น. · สุพัตรา เฮอริเทจ เวียงจันทน์",
    "托鉢の儀 5:00・誓いの式 16:30・ウェディングディナー 19:30・スパッタラ・ヘリテージ");

  /* ---- final closure: composed labels, room editorial, specs ---- */
  E("Pre-Wedding Journey · Optional · Before the wedding", "Reise vor der Hochzeit · Optional · Vor der Hochzeit", "การเดินทางก่อนวันงาน · ทางเลือก · ก่อนวันงาน", "ウェディング前の旅・任意・挙式前");
  E("Post-Wedding Journey · Optional · After the wedding", "Reise nach der Hochzeit · Optional · Nach der Hochzeit", "การเดินทางหลังวันงาน · ทางเลือก · หลังวันงาน", "ウェディング後の旅・任意・挙式後");
  E("Not selected yet · choose under My Stay", "Noch nicht gewählt · unter „Mein Zimmer“ wählen", "ยังไม่ได้เลือก · เลือกที่ ที่พักของฉัน", "未選択・「宿泊」からお選びください");
  E("Your departure · follows your onward itinerary", "Eure Abreise · folgt eurer Weiterreise", "การเดินทางกลับ · ตามแผนการเดินทางต่อของคุณ", "ご出発・その後のご旅程に合わせて");
  E("Shared ride with fellow guests · luggage handled · Guest Relations confirms your slot personally", "Gemeinsame Fahrt mit anderen Gästen · Gepäck inklusive · Guest Relations bestätigt euren Platz persönlich", "นั่งร่วมกับแขกท่านอื่น · ดูแลสัมภาระ · ฝ่ายดูแลแขกยืนยันรอบรถให้คุณ", "他のゲストと乗合・荷物のお世話付き・お時間はゲストリレーションズが確定");
  E("total contribution per guest", "Gesamtbeitrag pro Gast", "ยอดร่วมสมทบต่อท่าน", "お一人あたりのご負担額");
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

  E("total contribution · per guest", "Gesamtbeitrag · pro Gast", "ยอดร่วมสมทบ · ต่อท่าน", "ご負担額・お一人につき");
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
  E("Join the Journey", "Teil der Reise werden", "ร่วมเดินทางกับเรา", "旅に参加する");
  E("Open your Guest Area", "Öffnet euren Gästebereich", "เปิดพื้นที่สำหรับแขกของคุณ", "ゲストエリアを開く");
  E("Menu", "Menü", "เมนู", "メニュー");
  E("Request availability", "Verfügbarkeit anfragen", "สอบถามห้องว่าง", "空室をリクエスト");
  E("Request this room in your Guest Area", "Dieses Zimmer im Gästebereich anfragen", "ขอห้องนี้ในพื้นที่สำหรับแขก", "ゲストエリアでこの客室をリクエスト");
  E("choose your category", "wählt eure Kategorie", "เลือกประเภทห้องของคุณ", "カテゴリーを選ぶ");
  E("Room choice and availability live in your private Guest Area. Nothing to book, nothing to pay when you arrive.",
    "Zimmerwahl und Verfügbarkeit leben in eurem privaten Gästebereich. Nichts zu buchen, nichts zu zahlen bei der Ankunft.",
    "การเลือกห้องและห้องว่างอยู่ในพื้นที่ส่วนตัวของคุณ ไม่ต้องจอง ไม่ต้องจ่ายเมื่อมาถึง",
    "お部屋の選択と空き状況はプライベートなゲストエリアに。ご到着時のご予約もお支払いも不要です。");
  E("and request it in your Guest Area. A small number of complimentary alternative stays are also available, personally coordinated — Guest Relations is happy to help with rooms, availability or anything individual.",
    "und fragt es in eurem Gästebereich an. Eine kleine Zahl kostenfreier Alternativ-Unterkünfte ist ebenfalls verfügbar, persönlich koordiniert — Guest Relations hilft gern bei Zimmern, Verfügbarkeit oder allem Individuellen.",
    "แล้วส่งคำขอในพื้นที่สำหรับแขก ยังมีที่พักทางเลือกไม่มีค่าใช้จ่ายจำนวนเล็กน้อย ประสานงานเป็นการส่วนตัว ฝ่ายดูแลแขกยินดีช่วยทุกเรื่อง",
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
    "Bei Zimmern im Souphattra Heritage Vientiane deckt euer Beitrag die erste Nacht. Die zweite Nacht übernehmen",
    "สำหรับห้องพักที่สุพัตรา เฮอริเทจ ส่วนร่วมของคุณครอบคลุมคืนแรก คืนที่สองเป็นของขวัญจาก",
    "スパッタラ・ヘリテージの客室は、ご負担は1泊目のみ。2泊目のご招待は——");
  E("Before the wedding day begins, we gather in the early light for the alms giving at Souphattra Heritage Vientiane. Monks walk in procession, rice is offered, and nothing is hurried. It is a Lao morning, and it opens the whole day.",
    "Bevor der Hochzeitstag beginnt, versammeln wir uns im frühen Licht zur Almosengabe im Souphattra Heritage Vientiane. Mönche ziehen in Prozession, Reis wird gereicht, nichts wird eilig. Es ist ein laotischer Morgen — und er eröffnet den ganzen Tag.",
    "ก่อนวันแต่งงานจะเริ่ม เรารวมตัวกันในแสงเช้าตรู่เพื่อพิธีตักบาตรที่สุพัตรา เฮอริเทจ พระสงฆ์เดินบิณฑบาต ถวายข้าว อย่างไม่รีบร้อน นี่คือเช้าแบบลาว และเป็นการเปิดวันทั้งวัน",
    "式の一日が始まる前、朝の光の中で托鉢に集います。僧侶の列が進み、米が捧げられ、何も急がない。ラオスの朝が、この日全体を開きます。");
  E("As the day softens, everyone gathers at Souphattra Heritage Vientiane. Stillness, presence, and the vow spoken in front of the people who matter most.",
    "Wenn der Tag weicher wird, versammeln sich alle im Souphattra Heritage Vientiane. Stille, Gegenwart — und das Versprechen, gesprochen vor den Menschen, die am meisten bedeuten.",
    "เมื่อแสงแดดอ่อนลง ทุกคนมารวมกันที่สุพัตรา เฮอริเทจ ความสงบ การอยู่ตรงนั้น และคำสัญญาที่เอ่ยต่อหน้าคนสำคัญที่สุด",
    "日が和らぐころ、みなが集います。静けさと、その場に在ることと、大切な人々の前で交わされる誓い。");
  E("Sunset drinks beside the pool, then dinner in the courtyard garden: Lao food, music and celebration, together late into the night.",
    "Drinks am Pool zum Sonnenuntergang, dann Dinner im Hofgarten: laotisches Essen, Musik und Feiern — gemeinsam bis tief in die Nacht.",
    "จิบเครื่องดื่มริมสระยามอาทิตย์ตก แล้วต่อด้วยมื้อค่ำในสวน อาหารลาว ดนตรี และการเฉลิมฉลองด้วยกันจนดึก",
    "夕暮れのプールサイドで乾杯し、中庭でディナーを。ラオス料理と音楽と祝祭を、夜更けまで共に。");
  E("From sunset drinks beside the pool into the courtyard dinner, and late into the night.",
    "Von Drinks am Pool zum Sonnenuntergang ins Hof-Dinner — und bis tief in die Nacht.",
    "จากเครื่องดื่มริมสระยามเย็น สู่มื้อค่ำในลานสวน และยาวไปจนดึก",
    "夕暮れの乾杯から中庭のディナーへ、そして夜更けまで。");
  E("The most formal hour of the weekend, in the courtyard as the day softens.",
    "Die formellste Stunde des Wochenendes — im Innenhof, wenn der Tag weicher wird.",
    "ชั่วโมงที่เป็นทางการที่สุดของสุดสัปดาห์ ในลานบ้านยามแสงอ่อน",
    "週末で最も改まったひととき。日の和らぐ中庭で。");
  E("The participating temple will be announced with your itinerary. Your exact timing arrives in your Guest Area closer to the day.",
    "Der teilnehmende Tempel wird mit eurem Reiseplan bekannt gegeben. Eure genaue Zeit erhaltet ihr näher am Tag im Gästebereich.",
    "วัดที่ร่วมพิธีจะแจ้งพร้อมกำหนดการ เวลาที่แน่นอนจะส่งถึงพื้นที่สำหรับแขกเมื่อใกล้วันงาน",
    "参加寺院は旅程とともにお知らせします。正確な時間は、当日が近づいたらゲストエリアへ。");
  E("Timing and your table arrive in your Guest Area closer to the day.",
    "Zeit und Tisch erhaltet ihr näher am Tag im Gästebereich.",
    "เวลาและโต๊ะของคุณจะแจ้งในพื้นที่สำหรับแขกเมื่อใกล้วันงาน",
    "お時間とお席は、当日が近づいたらゲストエリアでご案内します。");
  E("Your exact arrival time and seat arrive in your Guest Area closer to the day.",
    "Eure genaue Ankunftszeit und euer Platz erhalten euch näher am Tag im Gästebereich.",
    "เวลามาถึงและที่นั่งของคุณจะแจ้งในพื้นที่สำหรับแขกเมื่อใกล้วันงาน",
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
  E("What to wear,", "Was ihr tragt,", "แต่งกายอย่างไร", "何を着るか、");
  E("day by day.", "Tag für Tag.", "ในแต่ละวัน", "日ごとに。");
  E("· First Class Sleeper from Krung Thep Aphiwat Central Terminal, waking in Nong Khai at 06:45", "· First Class Sleeper ab Krung Thep Aphiwat Central Terminal — Aufwachen in Nong Khai um 06:45", "· ตู้นอนชั้นหนึ่งจากสถานีกลางกรุงเทพอภิวัฒน์ ตื่นที่หนองคาย 06:45", "・クルンテープ・アピワット中央駅発ファーストクラス寝台、6:45にノーンカーイで目覚める");
  E("· Special Express No. 25 · Bangkok → Nong Khai", "· Special Express No. 25 · Bangkok → Nong Khai", "· รถด่วนพิเศษขบวนที่ 25 · กรุงเทพฯ → หนองคาย", "・特急25号・バンコク→ノーンカーイ");
  E("· a quiet Buddhist ritual to open the day", "· ein stilles buddhistisches Ritual zur Eröffnung des Tages", "· พิธีพุทธอันเงียบงามเพื่อเปิดวัน", "・一日を開く静かな仏教の儀式");
  E("· drinks by the pool, then Lao food, music and celebration in the courtyard garden", "· Drinks am Pool, dann laotisches Essen, Musik und Feiern im Hofgarten", "· เครื่องดื่มริมสระ ต่อด้วยอาหารลาว ดนตรี และการเฉลิมฉลองในสวน", "・プールサイドで乾杯、続いて中庭でラオス料理と音楽と祝祭");
  E("· the vows, in front of everyone who matters", "· das Versprechen, vor allen, die zählen", "· คำสัญญา ต่อหน้าทุกคนที่สำคัญ", "・大切な人みんなの前での誓い");
  E("· via Bangkok and Nong Khai · met and transferred", "· über Bangkok und Nong Khai · empfangen und transferiert", "· ผ่านกรุงเทพฯ และหนองคาย · มีคนรอรับและส่งต่อ", "・バンコクとノーンカーイ経由・お出迎えと送迎付き");
  E("· LINE & WhatsApp QR in your Guest Area", "· LINE- & WhatsApp-QR im Gästebereich", "· QR ของ LINE และ WhatsApp ในพื้นที่สำหรับแขก", "・LINE/WhatsAppのQRはゲストエリアに");
  E("By overnight sleeper train — Special Express No. 25 — to Nong Khai, then across the border · route reference:", "Mit dem Nachtzug — Special Express No. 25 — nach Nong Khai, dann über die Grenze · Streckenreferenz:", "โดยรถไฟตู้นอน รถด่วนพิเศษขบวนที่ 25 สู่หนองคาย แล้วข้ามพรมแดน · อ้างอิงเส้นทาง:", "夜行寝台・特急25号でノーンカーイへ、そして国境越え・路線参照：");
  E("(for reading only — Guest Relations arranges the tickets)", "(nur zum Nachlesen — Guest Relations besorgt die Tickets)", "(สำหรับอ่านเท่านั้น ฝ่ายดูแลแขกจัดการตั๋วให้)", "（ご参考まで——切符はゲストリレーションズが手配します）");
  E("State Railway of Thailand", "Staatsbahn von Thailand", "การรถไฟแห่งประเทศไทย", "タイ国鉄");
  E("or message us on LINE or WhatsApp — scan the codes in your Guest Area. Your Guest Relations team looks after you personally, from arrival to the last transfer.",
    "oder schreibt uns über LINE oder WhatsApp — scannt die Codes im Gästebereich. Euer Guest-Relations-Team kümmert sich persönlich um euch, von der Ankunft bis zum letzten Transfer.",
    "หรือส่งข้อความทาง LINE หรือ WhatsApp สแกนโค้ดในพื้นที่สำหรับแขก ทีมดูแลแขกดูแลคุณเป็นการส่วนตัว ตั้งแต่มาถึงจนถึงการรับส่งครั้งสุดท้าย",
    "またはLINE・WhatsAppでご連絡を——コードはゲストエリアに。到着から最後の送迎まで、ゲストリレーションズが直接おもてなしします。");
  E("or LINE and WhatsApp via the codes in your Guest Area.", "oder LINE und WhatsApp über die Codes im Gästebereich.", "หรือ LINE และ WhatsApp ผ่านโค้ดในพื้นที่สำหรับแขก", "またはゲストエリアのコードからLINE・WhatsAppで。");
  E("“what can I expect?”", "„Was erwartet mich?“", "“ฉันจะได้พบอะไร?”", "「何が待っている？」");
  E("“what happens next?”", "„Was passiert als Nächstes?“", "“ต่อไปจะเป็นอย่างไร?”", "「次はどうなる？」");
  E("↑ Top", "↑ Nach oben", "↑ ขึ้นบน", "↑ トップへ");
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
    "Eure Reise, euer Aufenthalt und euer Hochzeitserlebnis sind für euch vorbereitet.",
    "การเดินทาง ที่พัก และประสบการณ์งานแต่ง ถูกเตรียมไว้เพื่อคุณแล้ว",
    "旅も滞在も、ウェディングの体験も——すべてあなたのために整えられています。");
  E("Everything here has been prepared around you: the journey, the wedding days in Vientiane, your stay, and the small comforts in between. A few quiet questions, and Guest Relations takes it from there.",
    "Alles hier ist um euch herum vorbereitet: die Reise, die Hochzeitstage in Vientiane, euer Aufenthalt und die kleinen Annehmlichkeiten dazwischen. Ein paar ruhige Fragen — den Rest übernimmt Guest Relations.",
    "ทุกอย่างที่นี่ถูกเตรียมไว้รอบตัวคุณ การเดินทาง วันงานในเวียงจันทน์ ที่พัก และความสะดวกเล็ก ๆ ระหว่างทาง เพียงตอบคำถามเบา ๆ ไม่กี่ข้อ ที่เหลือฝ่ายดูแลแขกจัดการให้",
    "ここにあるすべては、あなたを中心に準備されています。旅、ビエンチャンでの婚礼の日々、滞在、その合間の小さな心地よさ。静かな質問にいくつか答えるだけで、あとはゲストリレーションズにお任せを。");
  E("Join the journey.", "Werdet Teil der Reise.", "ร่วมเดินทางไปด้วยกัน", "旅にご参加ください。");
  E("Begin", "Beginnen", "เริ่มต้น", "はじめる");
  E("My journey", "Meine Reise", "การเดินทางของฉัน", "マイジャーニー");
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

  /* pattern rules for short composed nodes (statuses etc.) */
  var RXP = [
    { re: /^(\d+) of (\d+) available$/, f: { de: function (m) { return m[1] + ' von ' + m[2] + ' verfügbar'; }, th: function (m) { return 'ว่าง ' + m[1] + ' จาก ' + m[2]; }, ja: function (m) { return m[2] + '室中' + m[1] + '室空きあり'; } } },
    { re: /^(\d+) of (\d+) seats remaining$/, f: { de: function (m) { return m[1] + ' von ' + m[2] + ' Plätzen frei'; }, th: function (m) { return 'เหลือที่นั่ง ' + m[1] + ' จาก ' + m[2]; }, ja: function (m) { return m[2] + '席中' + m[1] + '席空き'; } } },
  ];
  RXP.push({ re: /^([\d–-]+) sq\.m\.$/, f: { de: function (m) { return m[1] + ' m²'; }, th: function (m) { return m[1] + ' ตร.ม.'; }, ja: function (m) { return m[1] + '㎡'; } } });
  RXP.push({ re: /^(\d+) adults?(?: · (\d+) child(?:ren)?(?: sharing bedding)?)?$/, f: { de: function (m) { return m[1] + ' Erw.' + (m[2] ? ' · ' + m[2] + ' Kind' : ''); }, th: function (m) { return 'ผู้ใหญ่ ' + m[1] + (m[2] ? ' · เด็ก ' + m[2] : ''); }, ja: function (m) { return '大人' + m[1] + '名' + (m[2] ? '・子ども' + m[2] + '名' : ''); } } });
  RXP.push({ re: /^Up to (\d+) adults?(?: · (\d+) child(?:ren)?)?$/, f: { de: function (m) { return 'Bis zu ' + m[1] + ' Erw.' + (m[2] ? ' · ' + m[2] + ' Kind' : ''); }, th: function (m) { return 'สูงสุดผู้ใหญ่ ' + m[1] + (m[2] ? ' · เด็ก ' + m[2] : ''); }, ja: function (m) { return '最大大人' + m[1] + '名' + (m[2] ? '・子ども' + m[2] + '名' : ''); } } });
  RXP.push({ re: /^(\d+) rooms? allocated$/, f: { de: function (m) { return m[1] + ' Zimmer im Kontingent'; }, th: function (m) { return 'จัดสรร ' + m[1] + ' ห้อง'; }, ja: function (m) { return '割当' + m[1] + '室'; } } });
  RXP.push({ re: /^(\d+) seats? allocated$/, f: { de: function (m) { return m[1] + ' Plätze im Kontingent'; }, th: function (m) { return 'จัดสรร ' + m[1] + ' ที่นั่ง'; }, ja: function (m) { return '割当' + m[1] + '席'; } } });
  RXP.push({ re: /^(\d+) details? still needed$/, f: { de: function (m) { return m[1] + ' Angaben fehlen noch'; }, th: function (m) { return 'ยังขาดข้อมูล ' + m[1] + ' รายการ'; }, ja: function (m) { return 'あと' + m[1] + '件の入力が必要'; } } });
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
  /* §9: release validator reads these — a catalog-required string that stays
   * English under DE/TH/JA is recorded as a fallback invocation. */
  var MISSES = { de: {}, th: {}, ja: {} };
  function recordMiss(t) { if (lang !== 'en' && MISSES[lang]) MISSES[lang][t] = true; }
  function inCatalog(t) { return window.SIYL_CATALOG && window.SIYL_CATALOG.indexOf(t) > -1; }
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
