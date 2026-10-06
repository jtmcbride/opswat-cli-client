import type { RawDictionary } from '../format';

// Croatian (ijekavian standard). Nouns carry their gender in the part of speech ("n:f").
const hr: RawDictionary = {
  lang: 'hr',
  name: 'Croatian',
  entries: `
biti | to be | v | sam, si, je, smo, ste, su, nisam, nisi, nije, nismo, niste, nisu, bio, bila, bilo, bili, bile, budem, bude, bi, bih, jesam, jest, jesi
da | yes; that | conj
ne | no; not | adv
se | oneself (reflexive) | pron | sebe, sebi, sobom
i | and | conj
u | in; into | prep
to | that; it | pron | toga, tome, tim
što | what | pron | šta, čega, čemu
na | on; at; to | prep
ti | you (informal) | pron | te, tebe, tebi, tobom
za | for | prep
mi | we | pron | nas, nama
li | (question particle) | part
ja | I | pron | me, mene, meni, mnom
ali | but | conj
s | with | prep | sa
samo | only; just | adv
on | he | pron | ga, njega, mu, njemu, njim
od | from; of | prep
a | and; but (contrast) | conj
ovaj | this | det | ova, ovo, ovi, ove, ovog, ovoga, ovom, ovome, ovu, ovim, ovih
kako | how | adv
htjeti | to want; will (future) | v | hoću, hoćeš, hoće, hoćemo, hoćete, hoće, ću, ćeš, će, ćemo, ćete, htio, htjela, htjeli, neću, nećeš, neće
o | about | prep
dobro | well; good; okay | adv
ako | if | conj
sav | all; whole | det | sva, sve, svi, svu, svega, svim, svima
kao | like; as | conj
tako | so; like that | adv
ona | she | pron | ju, nju, joj, njoj, njom
ono | it | pron
vi | you (plural; formal) | pron | vas, vama
oni | they | pron | ih, njih, im, njima, one
imati | to have | v | imam, imaš, ima, imamo, imate, imaju, imao, imala, imali, nemam, nemaš, nema, nemamo, nemate, nemaju
znati | to know | v | znam, znaš, zna, znamo, znate, znaju, znao, znala
moći | can; to be able to | v | mogu, možeš, može, možemo, možete, mogli, mogao, mogla
sada | now | adv | sad
tu | here | adv
ovdje | here | adv
gdje | where | adv
kada | when | adv | kad
zašto | why | adv
tko | who | pron | koga, kome, kim
taj | that | det | ta, tog, tom, tih
koji | which; who | det | koja, koje, kojeg, koju, kojem, kojim
moj | my | det | moja, moje, moji, mog, mojeg, moju, mojoj, mojim, mojom, mome, mojem
tvoj | your (informal) | det | tvoja, tvoje, tvoji, tvog, tvoju, tvojoj
njegov | his | det | njegova, njegovo, njegovi, njegovu
njezin | her | det | njezina, njezino, njezini, njezinu
naš | our | det | naša, naše, naši, našu, našem
vaš | your (plural; formal) | det | vaša, vaše, vaši, vašu
njihov | their | det | njihova, njihovo, njihovi
svoj | one's own | det | svoja, svoje, svoji, svoju, svojom
reći | to say; to tell | v | rekao, rekla, rekli, reci, recite
kazati | to say | v | kažem, kažeš, kaže, kažemo, kažu
ići | to go | v | idem, ideš, ide, idemo, idete, idu, išao, išla, išli, idi, idite
doći | to come | v | dođem, dođeš, dođe, dođemo, dođu, došao, došla, došli, dođi, dođite
dolaziti | to come (regularly); to be coming | v | dolazim, dolaziš, dolazi, dolazimo, dolaze
raditi | to work; to do | v | radim, radiš, radi, radimo, radite, rade, radio, radila, radili
vidjeti | to see | v | vidim, vidiš, vidi, vidimo, vidite, vide, vidio, vidjela, vidjeli
trebati | to need; should | v | trebam, trebaš, treba, trebamo, trebate, trebaju, trebao, trebala
morati | must; to have to | v | moram, moraš, mora, moramo, morate, moraju, morao, morala
misliti | to think | v | mislim, misliš, misli, mislimo, mislite, misle, mislio, mislila
govoriti | to speak | v | govorim, govoriš, govori, govorimo, govorite, govore, govorio
voljeti | to love; to like | v | volim, voliš, voli, volimo, volite, vole, volio, voljela
željeti | to wish; to want | v | želim, želiš, želi, želimo, želite, žele, želio, željela
živjeti | to live | v | živim, živiš, živi, živimo, živite, žive, živio, živjela
zvati | to call | v | zovem, zoveš, zove, zovemo, zovete, zovu, zvao
dati | to give | v | dam, daš, damo, daju, dao, dala, daj, dajte
uzeti | to take | v | uzmem, uzmeš, uzme, uzmemo, uzmu, uzeo, uzela
razumjeti | to understand | v | razumijem, razumiješ, razumije, razumijemo, razumiju, razumio
ponoviti | to repeat | v | ponovim, ponoviš, ponovi, ponovite, ponovio
pomoći | to help | v | pomognem, pomogneš, pomogne, pomozi, pomozite, pomogao, pomogla
jesti | to eat | v | jedem, jedeš, jede, jedemo, jedete, jedu, jeo, jela
piti | to drink | v | pijem, piješ, pije, pijemo, pijete, piju, pio, pila
spavati | to sleep | v | spavam, spavaš, spava, spavamo, spavate, spavaju, spavao
čitati | to read | v | čitam, čitaš, čita, čitamo, čitaju, čitao, čitala
pisati | to write | v | pišem, pišeš, piše, pišemo, pišu, pisao, pisala
učiti | to learn; to study | v | učim, učiš, uči, učimo, uče, učio, učila
gledati | to watch; to look | v | gledam, gledaš, gleda, gledamo, gledaju, gledao, gledala
slušati | to listen | v | slušam, slušaš, sluša, slušamo, slušaju, slušao
igrati | to play | v | igram, igraš, igra, igramo, igraju, igrao
kupiti | to buy | v | kupim, kupiš, kupi, kupimo, kupe, kupio, kupila
platiti | to pay | v | platim, platiš, plati, platimo, plate, platio
koštati | to cost | v | košta, koštaju, koštalo
čekati | to wait | v | čekam, čekaš, čeka, čekamo, čekaju, čekao, čekaj
putovati | to travel | v | putujem, putuješ, putuje, putujemo, putuju, putovao
početi | to begin | v | počnem, počne, počinje, počeo, počela
ostati | to stay | v | ostanem, ostaneš, ostane, ostanemo, ostanu, ostao, ostala
kuhati | to cook | v | kuham, kuhaš, kuha, kuhamo, kuhaju, kuhao, kuhala
padati | to fall | v | pada, padaju, padao, padala
kasniti | to be late | v | kasnim, kasniš, kasni, kasnio, kasnila
otvoriti | to open | v | otvorim, otvori, otvorite, otvorio
zatvoriti | to close | v | zatvorim, zatvori, zatvorio
plivati | to swim | v | plivam, plivaš, pliva, plivamo, plivaju
čovjek | man; person | n:m | čovjeka, čovjeku, ljudi, ljude, ljudima
žena | woman; wife | n:f | žene, ženi, ženu, ženom, ženama
muškarac | man | n:m | muškarca, muškarci
dijete | child | n:n | djeteta, djetetu, djeca, djecu, djecom, djece
majka | mother | n:f | majke, majci, majku, majkom
mama | mom | n:f | mame, mami, mamu, mamom
otac | father | n:m | oca, ocu, ocem
tata | dad | n:m | tate, tati, tatu, tatom
brat | brother | n:m | brata, bratu, bratom, braća, braću
sestra | sister | n:f | sestre, sestri, sestru, sestrom
prijatelj | friend | n:m | prijatelja, prijatelju, prijateljem, prijatelji, prijateljima
prijateljica | friend (female) | n:f | prijateljice, prijateljici, prijateljicu
obitelj | family | n:f | obitelji, obiteljom
kuća | house; home | n:f | kuće, kući, kuću, kućom, kućama
stan | apartment | n:m | stana, stanu, stanom
grad | city; town | n:m | grada, gradu, gradom, gradovi
zemlja | country; earth | n:f | zemlje, zemlji, zemlju
Hrvatska | Croatia | n:f | Hrvatske, Hrvatskoj, Hrvatsku
Zagreb | Zagreb | n:m | Zagreba, Zagrebu
Split | Split | n:m | Splita, Splitu
more | sea | n:n | mora, moru, morem
otok | island | n:m | otoka, otoku, otoci
plaža | beach | n:f | plaže, plaži, plažu
voda | water | n:f | vode, vodi, vodu, vodom
kava | coffee | n:f | kave, kavi, kavu, kavom
čaj | tea | n:m | čaja, čaju
čaša | glass | n:f | čaše, čašu
kruh | bread | n:m | kruha, kruhu
mlijeko | milk | n:n | mlijeka, mlijekom
sir | cheese | n:m | sira, sirom
vino | wine | n:n | vina, vinu
pivo | beer | n:n | piva
riba | fish | n:f | ribe, ribu, ribom
meso | meat | n:n | mesa, mesom
jabuka | apple | n:f | jabuke, jabuku
voće | fruit | n:n | voća
povrće | vegetables | n:n | povrća
juha | soup | n:f | juhe, juhu
salata | salad | n:f | salate, salatu
sladoled | ice cream | n:m | sladoleda
hrana | food | n:f | hrane, hranu
doručak | breakfast | n:m | doručka, doručku
ručak | lunch | n:m | ručka, ručku
večera | dinner | n:f | večere, večeru
restoran | restaurant | n:m | restorana, restoranu
konobar | waiter | n:m | konobara, konobaru
račun | bill; account | n:m | računa, računu
dan | day | n:m | dana, danu, dani
noć | night | n:f | noći, noću
jutro | morning | n:n | jutra, jutru
večer | evening | n:f | večeri
tjedan | week | n:m | tjedna, tjednu
godina | year | n:f | godine, godinu, godini
vrijeme | time; weather | n:n | vremena, vremenu
sat | hour; clock; lesson | n:m | sata, satu, sati
minuta | minute | n:f | minute, minutu
ljeto | summer | n:n | ljeta, ljetu, ljeti
zima | winter | n:f | zime, zimu, zimi
sunce | sun | n:n | sunca, suncu
kiša | rain | n:f | kiše, kiši, kišu
rođendan | birthday | n:m | rođendana, rođendanu
posao | job; work | n:m | posla, poslu
škola | school | n:f | škole, školi, školu
knjiga | book | n:f | knjige, knjizi, knjigu, knjigom
jezik | language; tongue | n:m | jezika, jeziku, jezici
riječ | word | n:f | riječi
ime | name | n:n | imena, imenu
broj | number | n:m | broja, broju
telefon | phone | n:m | telefona, telefonu, telefonom
pitanje | question | n:n | pitanja
odgovor | answer | n:m | odgovora
put | way; trip; time (occasion) | n:m | puta, putu
život | life | n:m | života, životu
ljubav | love | n:f | ljubavi
pomoć | help | n:f
ruka | hand; arm | n:f | ruke, ruci, ruku
glava | head | n:f | glave, glavi, glavu
srce | heart | n:n | srca
auto | car | n:m | auta, autu, autom
vlak | train | n:m | vlaka, vlaku, vlakom
autobus | bus | n:m | autobusa, autobusu, autobusom
kolodvor | (train or bus) station | n:m | kolodvora, kolodvoru
aerodrom | airport | n:m | aerodroma, aerodromu
karta | ticket; map | n:f | karte, kartu
ulica | street | n:f | ulice, ulici, ulicu
trgovina | shop | n:f | trgovine, trgovini, trgovinu
hotel | hotel | n:m | hotela, hotelu
soba | room | n:f | sobe, sobi, sobu
kino | cinema | n:n | kina, kinu
park | park | n:m | parka, parku
novac | money | n:m | novca, novcem
euro | euro | n:m | eura
pas | dog | n:m | psa, psu, psom, psi
mačka | cat | n:f | mačke, mački, mačku
stol | table | n:m | stola, stolu
prozor | window | n:m | prozora, prozoru
vrata | door | n:n | vratima
glazba | music | n:f | glazbe, glazbu
film | film; movie | n:m | filma, filmu, filmove
liječnik | doctor | n:m | liječnika, liječniku
liječnica | doctor (female) | n:f | liječnice, liječnicu
učitelj | teacher | n:m | učitelja, učitelju
učiteljica | teacher (female) | n:f | učiteljice, učiteljicu
dobar | good | adj | dobra, dobri, dobre, dobrog, dobru, dobrom
loš | bad | adj | loša, loše, loši
velik | big; great | adj | velika, veliko, veliki, velike
mali | small; little | adj | mala, male, malog, malu, malom
nov | new | adj | nova, novo, novi, nove, novog, novu
star | old | adj | stara, staro, stari, stare, starog
lijep | beautiful; nice | adj | lijepa, lijepo, lijepi, lijepe, lijepu
hladan | cold | adj | hladna, hladno, hladni
topao | warm | adj | topla, toplo, topli
vruć | hot | adj | vruća, vruće, vrući
sretan | happy | adj | sretna, sretno, sretni
umoran | tired | adj | umorna, umorno, umorni
gladan | hungry | adj | gladna, gladni
žedan | thirsty | adj | žedna, žedni
skup | expensive | adj | skupa, skupo, skupi
jeftin | cheap | adj | jeftina, jeftino, jeftini
crven | red | adj | crvena, crveno, crveni
plav | blue | adj | plava, plavo, plavi
zelen | green | adj | zelena, zeleno, zeleni
bijel | white | adj | bijela, bijelo, bijeli
crn | black | adj | crna, crno, crni
hrvatski | Croatian | adj | hrvatskog, hrvatskom, hrvatsko, hrvatsku
engleski | English | adj | engleska, englesko, engleskog
prvi | first | adj | prva, prvo
jedan | one; a | num | jedna, jedno, jednu, jednog
dva | two | num | dvije
tri | three | num
četiri | four | num
pet | five | num
šest | six | num
sedam | seven | num
osam | eight | num
devet | nine | num
deset | ten | num
dvadeset | twenty | num
danas | today | adv
sutra | tomorrow | adv
jučer | yesterday | adv
ujutro | in the morning | adv
navečer | in the evening | adv
uvijek | always | adv
nikad | never | adv | nikada
često | often | adv
ponekad | sometimes | adv
vrlo | very | adv
jako | very; strongly | adv
puno | a lot; many | adv
mnogo | much; many | adv
malo | a little; few | adv
više | more | adv
dovoljno | enough | adv
tamo | there | adv
lijevo | left; to the left | adv
desno | right; to the right | adv
ravno | straight ahead | adv
blizu | near | adv
daleko | far | adv
koliko | how much; how many | adv
već | already | adv
još | still; yet; more | adv
također | also | adv
možda | maybe | adv
naravno | of course | adv
baš | just; exactly | adv
zato | that's why; therefore | adv
nešto | something | pron | nečega
ništa | nothing | pron | ničega
netko | someone | pron | nekoga
nitko | nobody | pron | nikoga
jer | because | conj
ili | or | conj
nego | than; but rather | conj
pa | so; and then | conj
dok | while | conj
iz | from; out of | prep
do | to; until; next to | prep
kod | at (someone's place); near | prep
po | by; per; along | prep
prema | towards | prep
bez | without | prep
nakon | after | prep
prije | before | prep
između | between | prep
kroz | through | prep
evo | here is | part
hvala | thank you | intj
molim | please; you're welcome | intj
bok | hi; bye | intj
zdravo | hello | intj
doviđenja | goodbye | intj
oprostite | excuse me; sorry | intj | oprosti
izvolite | here you are; can I help you? | intj | izvoli
`,
  sentences: `
Bok, kako si? | Hi, how are you?
Dobro sam, hvala. | I'm fine, thanks.
Kako se zoveš? | What's your name?
Kako se zove tvoj brat? | What's your brother's name?
Ja sam iz Hrvatske. | I'm from Croatia.
Živim u Zagrebu. | I live in Zagreb.
Govoriš li engleski? | Do you speak English?
Govorim malo hrvatski. | I speak a little Croatian.
Ne razumijem. | I don't understand.
Možete li ponoviti? | Could you repeat that?
Imam dva brata i jednu sestru. | I have two brothers and one sister.
Moja majka je liječnica. | My mother is a doctor.
Moj otac radi u školi. | My father works at a school.
Volim kavu s mlijekom. | I like coffee with milk.
Želim čašu vode. | I'd like a glass of water.
Koliko to košta? | How much does that cost?
To je jako skupo. | That's very expensive.
Gdje je kolodvor? | Where is the station?
Idite ravno pa lijevo. | Go straight ahead, then left.
Hotel je blizu mora. | The hotel is near the sea.
Danas je lijepo vrijeme. | The weather is nice today.
Sutra će padati kiša. | It will rain tomorrow.
Jučer smo bili na plaži. | Yesterday we were at the beach.
Ljeti često idemo na more. | In summer we often go to the seaside.
Što radiš? | What are you doing?
Čitam knjigu. | I'm reading a book.
Gledamo film. | We're watching a film.
Djeca se igraju u parku. | The children are playing in the park.
Mačka spava na stolu. | The cat is sleeping on the table.
Gladan sam. | I'm hungry.
Umorna sam. | I'm tired.
Što želite jesti? | What would you like to eat?
Ja ću ribu i salatu. | I'll have the fish and a salad.
Račun, molim. | The bill, please.
Hvala, doviđenja! | Thank you, goodbye!
Gdje živiš? | Where do you live?
Moja sestra živi u Splitu. | My sister lives in Split.
Ovo je moj prijatelj. | This is my friend.
Ona je moja prijateljica. | She is my friend.
Imaš li psa? | Do you have a dog?
Nemam vremena. | I don't have time.
Koliko je sati? | What time is it?
Sada je osam sati. | It's eight o'clock now.
Trebam pomoć. | I need help.
Možeš li mi pomoći? | Can you help me?
Ne znam gdje je. | I don't know where it is.
Mislim da je to dobro. | I think that's good.
Učim hrvatski jezik. | I'm learning Croatian.
Ova knjiga je nova. | This book is new.
Taj auto je star. | That car is old.
Kuća je velika i lijepa. | The house is big and beautiful.
Voda je hladna. | The water is cold.
Kava je vruća. | The coffee is hot.
Uvijek pijem čaj ujutro. | I always drink tea in the morning.
Navečer čitam. | In the evening I read.
Nikad ne pijem pivo. | I never drink beer.
Idemo u kino! | Let's go to the cinema!
Gdje je trgovina? | Where is the shop?
Kupio sam kruh i sir. | I bought bread and cheese.
Moram ići. | I have to go.
Vidimo se sutra! | See you tomorrow!
Sretan rođendan! | Happy birthday!
Volim te. | I love you.
Ne volim kišu. | I don't like rain.
Moj brat ima deset godina. | My brother is ten years old.
Imam dvadeset godina. | I'm twenty years old.
Zimi je hladno. | It's cold in winter.
Vlak dolazi za pet minuta. | The train arrives in five minutes.
Autobus je kasnio. | The bus was late.
Oprostite, gdje je hotel? | Excuse me, where is the hotel?
Izvolite, vaša kava. | Here you are, your coffee.
Ne mogu doći danas. | I can't come today.
Što je ovo? | What is this?
Tko je to? | Who is that?
Zašto ne spavaš? | Why aren't you sleeping?
Ne spavam jer nisam umoran. | I'm not sleeping because I'm not tired.
Kada počinje film? | When does the film start?
Dijete pije mlijeko. | The child is drinking milk.
Na stolu su jabuke. | There are apples on the table.
Moji prijatelji putuju na otok. | My friends are travelling to the island.
Moramo platiti račun. | We have to pay the bill.
Želite li još kave? | Would you like more coffee?
Ne, hvala. To je dovoljno. | No, thank you. That's enough.
Ovo je jako dobro! | This is really good!
`,
};

export default hr;
