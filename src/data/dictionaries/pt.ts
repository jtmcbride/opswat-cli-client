import type { RawDictionary } from '../format';

// Brazilian Portuguese spelling and usage (você, ônibus, café da manhã).
const pt: RawDictionary = {
  lang: 'pt',
  name: 'Portuguese',
  entries: `
de | of; from | prep | do, da, dos, das
o | the (m.); it; him | art | os
a | to; at; the (f.) | prep | as, ao, à, aos, às
que | that; which; what | conj
e | and | conj
em | in; on; at | prep | no, na, nos, nas, num, numa
um | a; an; one | art | uma, uns, umas
ser | to be (permanent) | v | sou, é, somos, são, era, foi, sido
não | no; not | adv
para | for; to; in order to | prep | pra
com | with | prep | comigo
por | by; for; through (por que = why) | prep | pelo, pela, pelos, pelas
se | oneself; if | pron
mais | more; most | adv
como | how; like; as | adv
estar | to be (state, location) | v | estou, está, estamos, estão, estava
ter | to have | v | tenho, tem, temos, têm, tinha
eu | I | pron | me, mim
você | you | pron | vocês, te
ele | he; him; it | pron | eles
ela | she; her; it | pron | elas
nós | we; us | pron
meu | my; mine | det | minha, meus, minhas
seu | your; his; her | det | sua, seus, suas
nosso | our | det | nossa, nossos, nossas
este | this | det | esta, estes, estas, isto
esse | that | det | essa, esses, essas, isso
todo | all; every | det | toda, todos, todas, tudo
outro | other; another | det | outra, outros, outras
mas | but | conj
ou | or | conj
quando | when | adv
onde | where | adv
porque | because | conj
quem | who | pron
quanto | how much; how many | adv | quanta, quantos, quantas
qual | which; what | det | quais
muito | very; a lot; much | adv | muita, muitos, muitas
pouco | little; a little | adv | pouca, poucos, poucas
também | also; too | adv
já | already | adv
ainda | still; yet | adv
sempre | always | adv
nunca | never | adv
vez | time (occurrence) (às vezes = sometimes) | n | vezes
até | until; see you (até logo) | prep
juntos | together | adv | juntas
cedo | early | adv
tarde | late; afternoon | adv | tardes
devagar | slowly | adv
hoje | today | adv
amanhã | tomorrow | adv
ontem | yesterday | adv
aqui | here | adv | daqui
ali | there | adv
perto | near; close | adv
longe | far | adv
agora | now | adv
logo | soon; later | adv
sim | yes | adv
bem | well; fine | adv
mal | badly | adv
olá | hello | intj | oi
tchau | bye | intj
obrigado | thank you | intj | obrigada
favor | favor (por favor = please) | n
bom | good | adj | boa, bons, boas
ruim | bad | adj
grande | big; great | adj | grandes
pequeno | small; little | adj | pequena, pequenos, pequenas
novo | new; young | adj | nova, novos, novas
velho | old | adj | velha, velhos, velhas
jovem | young | adj | jovens
alto | tall; high | adj | alta, altos, altas
bonito | pretty; beautiful | adj | bonita, bonitos, bonitas
fácil | easy | adj
difícil | difficult | adj
caro | expensive; dear | adj | cara, caros, caras
cansado | tired | adj | cansada, cansados, cansadas
feliz | happy | adj
rápido | fast | adj | rápida
pronto | ready | adj | pronta
favorito | favorite | adj | favorita
frio | cold | adj | fria, frios, frias
quente | hot; warm | adj
calor | heat (está calor = it's hot) | n
fazer | to do; to make | v | faço, faz, fazemos, fazem, fez
poder | can; to be able to | v | posso, pode, podemos, podem
querer | to want | v | quero, quer, queremos, querem
dever | must; should | v | devo, deve, devemos, devem
precisar | to need | v | preciso, precisa, precisamos, precisam
ir | to go | v | vou, vai, vamos, vão
vir | to come | v | venho, vem, vimos, vêm
dizer | to say; to tell | v | digo, diz, dizemos, dizem
ver | to see | v | vejo, vê, vemos, veem
saber | to know (facts) | v | sei, sabe, sabemos, sabem
conhecer | to know (people, places) | v | conheço, conhece, conhecemos, conhecem
falar | to speak; to talk | v | falo, fala, falamos, falam
chamar | to call (chamar-se = to be named) | v | chamo, chama, chamam
morar | to live (reside) | v | moro, mora, moramos, moram
viver | to live | v | vivo, vive, vivemos, vivem
trabalhar | to work | v | trabalho, trabalha, trabalhamos, trabalham
comer | to eat | v | come, comemos, comem
beber | to drink | v | bebo, bebe, bebemos, bebem
tomar | to take; to drink | v | tomo, toma, tomamos, tomam
ler | to read | v | leio, lê, lemos, leem
escrever | to write | v | escrevo, escreve, escrevemos, escrevem
dormir | to sleep | v | durmo, dorme, dormimos, dormem
brincar | to play (children) | v | brinco, brinca, brincamos, brincam
entender | to understand | v | entendo, entende, entendemos, entendem
aprender | to learn | v | aprendo, aprende, aprendemos, aprendem, aprendendo
estudar | to study | v | estudo, estuda, estudamos, estudam
comprar | to buy | v | compro, compra, compramos, compram
procurar | to look for | v | procuro, procura, procuramos, procuram
encontrar | to find | v | encontro, encontra, encontramos, encontram
esperar | to wait; to hope | v | espero, espera, esperamos, esperam
ajudar | to help | v | ajudo, ajuda, ajudamos, ajudam
abrir | to open | v | abro, abre, abrimos, abrem, abra
fechar | to close | v | fecho, fecha, fechamos, fecham, feche
ficar | to stay; to be located | v | fico, fica, ficamos, ficam
cozinhar | to cook | v | cozinho, cozinha, cozinhamos, cozinham
viajar | to travel | v | viajo, viaja, viajamos, viajam
correr | to run | v | corro, corre, corremos, correm
andar | to walk | v | ando, anda, andamos, andam
chegar | to arrive | v | chego, chega, chegamos, chegam
sair | to go out; to leave | v | saio, sai, saímos, saem
voltar | to come back | v | volto, volta, voltamos, voltam
pensar | to think | v | penso, pensa, pensamos, pensam
achar | to think; to find | v | acho, acha, achamos, acham
gostar | to like | v | gosto, gosta, gostamos, gostam
preferir | to prefer | v | prefiro, prefere, preferimos, preferem
custar | to cost | v | custa, custam
amar | to love | v | amo, ama, amamos, amam
haver | to exist (há = there is) | v | há
casa | house; home | n | casas
dia | day | n | dias
ano | year | n | anos
semana | week | n
hora | hour; time | n | horas
manhã | morning | n
noite | night | n | noites
tempo | time; weather | n
vida | life | n
mundo | world | n
gente | people | n
homem | man | n | homens
mulher | woman; wife | n | mulheres
criança | child | n | crianças
menino | boy | n | menina, meninos, meninas
amigo | friend | n | amiga, amigos, amigas
família | family | n
pai | father | n | pais
mãe | mother | n
irmão | brother | n | irmã, irmãos, irmãs
cachorro | dog | n | cachorros
gato | cat | n | gatos
cidade | city | n
país | country | n
rua | street | n
escola | school | n
trabalho | work; job | n
carro | car | n
trem | train | n
ônibus | bus | n
cinema | cinema | n
parque | park | n
praia | beach | n
mercado | market | n
loja | shop; store | n
porta | door | n
mesa | table | n
dinheiro | money | n
livro | book | n | livros
água | water | n
pão | bread | n
café | coffee | n
chá | tea | n
leite | milk | n
vinho | wine | n
maçã | apple | n
queijo | cheese | n
comida | food | n
jantar | dinner; to have dinner | n
música | music | n
filme | film; movie | n
português | Portuguese | n
inglês | English | n
língua | language; tongue | n
palavra | word | n | palavras
pergunta | question | n
resposta | answer | n
ideia | idea | n
história | story; history | n
aniversário | birthday | n
fim | end (fim de semana = weekend) | n
fome | hunger (estar com fome = to be hungry) | n
sede | thirst (estar com sede = to be thirsty) | n
sol | sun | n
dois | two | num | duas
três | three | num
cinco | five | num
sábado | Saturday | n
domingo | Sunday | n
cada | each; every | det
`,
  sentences: `
Oi, tudo bem? | Hi, how are you?
Estou muito bem, obrigado. | I'm very well, thank you.
Como você se chama? | What's your name?
Eu tenho dois irmãos. | I have two brothers.
Minha mãe é muito jovem. | My mother is very young.
Meu pai trabalha na cidade. | My father works in the city.
O cachorro está em casa. | The dog is at home.
O gato dorme na mesa. | The cat is sleeping on the table.
Eu quero um café, por favor. | I'd like a coffee, please.
Você quer água? | Do you want water?
Estou com fome. | I'm hungry.
Estou com sede. | I'm thirsty.
Hoje está frio. | It's cold today.
Está muito calor. | It's very hot.
Onde fica a praia? | Where is the beach?
A loja é perto daqui. | The shop is close to here.
O mercado é longe. | The market is far.
Eu gosto de música. | I like music.
Eu gosto muito de livros. | I really like books.
Eu não gosto de chá. | I don't like tea.
Você gosta de vinho? | Do you like wine?
Ela lê um livro. | She is reading a book.
Ele escreve um livro novo. | He is writing a new book.
Nós moramos numa cidade pequena. | We live in a small city.
Eles moram em outro país. | They live in another country.
Onde você mora? | Where do you live?
Eu moro perto do parque. | I live near the park.
Minha casa é pequena mas bonita. | My house is small but pretty.
A comida está muito boa. | The food is very good.
O pão é bom. | The bread is good.
Eu preciso de dinheiro. | I need money.
O carro é muito caro. | The car is very expensive.
Esse carro é velho. | That car is old.
Minha irmã é jovem. | My sister is young.
Meu amigo é muito alto. | My friend is very tall.
Estou cansado. | I'm tired.
Ela está cansada hoje. | She is tired today.
Nós somos amigos. | We are friends.
Quem é ela? | Who is she?
O que você quer fazer hoje? | What do you want to do today?
Eu quero ir ao cinema. | I want to go to the cinema.
Amanhã vamos à praia. | Tomorrow we're going to the beach.
Eu vou para a escola de ônibus. | I go to school by bus.
O trem chega às três. | The train arrives at three.
A que horas chega o trem? | What time does the train arrive?
São cinco horas. | It's five o'clock.
Bom dia! | Good morning!
Boa tarde! | Good afternoon!
Boa noite! | Good night!
Tchau, até amanhã. | Bye, see you tomorrow.
Até logo! | See you later!
Eu falo um pouco de português. | I speak a little Portuguese.
Você fala inglês? | Do you speak English?
Eu não entendo. | I don't understand.
Você pode falar mais devagar? | Can you speak more slowly?
Estou aprendendo português. | I'm learning Portuguese.
Eu quero aprender português. | I want to learn Portuguese.
Eu estudo todos os dias. | I study every day.
A língua é difícil. | The language is difficult.
Esta pergunta é fácil. | This question is easy.
Eu não sei a resposta. | I don't know the answer.
Você sabe onde fica o parque? | Do you know where the park is?
Eu conheço o seu irmão. | I know your brother.
Minha família é grande. | My family is big.
As crianças brincam no parque. | The children are playing in the park.
O menino come uma maçã. | The boy is eating an apple.
Ela bebe leite. | She drinks milk.
Eu tomo café de manhã. | I drink coffee in the morning.
O jantar está na mesa. | Dinner is on the table.
Eu gosto de cozinhar. | I like to cook.
Minha mãe cozinha muito bem. | My mother cooks very well.
Eu sempre chego cedo. | I always arrive early.
Ele nunca chega tarde. | He never arrives late.
Às vezes eu vou ao mercado. | Sometimes I go to the market.
Eu compro queijo no mercado. | I buy cheese at the market.
Quanto custa? | How much does it cost?
É muito caro. | It's very expensive.
Eu preciso comprar pão. | I need to buy bread.
Você pode me ajudar? | Can you help me?
Abra a porta, por favor. | Open the door, please.
Feche a porta. | Close the door.
Eu espero o ônibus. | I'm waiting for the bus.
Eu procuro o meu livro. | I'm looking for my book.
Eu não encontro o meu dinheiro. | I can't find my money.
Eu acho que é bom. | I think it's good.
Acho que sim. | I think so.
Acho que não. | I don't think so.
Já é tarde. | It's already late.
Ainda não. | Not yet.
Eu volto logo. | I'll be back soon.
Eu saio com os meus amigos. | I'm going out with my friends.
No sábado vamos ao cinema. | On Saturday we're going to the cinema.
Domingo é o meu aniversário. | Sunday is my birthday.
Eu gosto de viajar. | I like to travel.
Eu quero viajar para outro país. | I want to travel to another country.
A vida é bonita. | Life is beautiful.
O mundo é muito grande. | The world is very big.
Qual é o seu filme favorito? | What's your favorite movie?
Meu filme favorito é velho. | My favorite movie is old.
A água está fria. | The water is cold.
Eu prefiro chá. | I prefer tea.
Nós estamos em casa. | We're at home.
Eles estão no trabalho. | They're at work.
Eu trabalho muito. | I work a lot.
No fim de semana eu durmo muito. | On the weekend I sleep a lot.
Eu corro no parque de manhã. | I run in the park in the morning.
Nós andamos juntos para a escola. | We walk to school together.
Eu leio um livro cada noite. | I read a book every night.
Essa história é muito bonita. | That story is very beautiful.
Eu tenho uma pergunta. | I have a question.
O que é isso? | What is that?
Eu não tenho tempo. | I don't have time.
Há muita gente aqui. | There are a lot of people here.
Tem um gato na rua. | There's a cat in the street.
Meu cachorro é muito rápido. | My dog is very fast.
Eu sou feliz. | I'm happy.
É uma boa ideia. | It's a good idea.
É uma ideia ruim. | It's a bad idea.
Que horas são? | What time is it?
Por que você vai? | Why are you going?
Porque estou cansado. | Because I'm tired.
Estou pronto. | I'm ready.
Ontem foi um dia bonito. | Yesterday was a beautiful day.
Eu te amo. | I love you.
`,
};

export default pt;
