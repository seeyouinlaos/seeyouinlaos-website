#!/bin/bash

cd "/Users/thongantang/peoject.claude.skill.canva/seeyouinlaos-website/seeyouinlaos-website" || exit

git add .

git commit -m "Website Update $(date '+%Y-%m-%d %H:%M:%S')"

git push

echo ""
echo "✅ Website erfolgreich veröffentlicht."
echo ""
read -n 1 -s -r -p "Zum Beenden eine Taste drücken..."