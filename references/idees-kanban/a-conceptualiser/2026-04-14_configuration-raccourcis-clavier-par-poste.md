# Configuration raccourcis clavier par poste

---

## 2026-04-14 — agent

Idee a formaliser pour une **version future**, sans implementation immediate : prevoir une **page admin par poste de travail / terminal** pour configurer les raccourcis clavier utilises dans l application, notamment cote kiosque / finalisation.

Pistes a capturer :
- declarer le **type de poste / layout clavier** (PC FR, autre langue, Mac, etc.) ;
- permettre une configuration des **raccourcis par terminal** plutot qu un mapping unique global ;
- connecter ensuite les **mappings clavier du kiosque et de la finalisation** a cette configuration poste ;
- traiter cela comme un sujet de parametrage et de compatibilite materiel / layout, a cadrer plus tard.

But :
- reduire les hypotheses implicites sur le clavier operateur ;
- rendre les raccourcis robustes selon le contexte reel du poste ;
- preparer un branchement propre des ecrans kiosque / finalisation sur une configuration admin dediee.

Intention : a-conceptualiser
