/* THE UNWRITTEN RULES (Owner, 27 Sep 2026) — Multicultural Wedding Etiquette, the Owner-approved final guide in full.
 * The ONE source of the page (unwritten-rules.html, its generated block), of the downloadable mini-magazine
 * (assets/pdf/see-you-in-laos-unwritten-rules.pdf) and of the tests: src/build-unwritten-rules.cjs builds both from this file,
 * and the release gate U1 fails when either no longer matches it. The wording is the Owner's, verbatim — typography only
 * (the em dash, the curly apostrophe, kreng jai in italics). Thai lives in src/i18n-th.json, like every other sentence.
 * Blocks: ['p', prose] · ['q', a statement set apart] · ['h', a heading inside a rule] · ['l', [lines]] — <em> is the only markup. */
(function (root) {
  'use strict';
  var UR = {
    VERSION: '2026-09-27',
    title: "Multicultural Wedding Etiquette",
    subtitle: "Understanding the Courtesy Behind an International Celebration",
    kicker: "The Unwritten Rules Every Wedding Guest Should Know",
    intro: {
      blocks: [
        ['p', "A multicultural wedding brings together more than families and friends. It brings together different cultures, traditions, expectations and understandings of hospitality."],
        ['p', "What is considered completely normal, polite or generous in one culture may be understood differently in another. Expectations around family, seating, invitations, dress, accommodation, hospitality, ceremony, gifts and the role of a guest can vary significantly."],
        ['p', "This does not mean that one tradition is right and another is wrong."],
        ['p', "It means that an international wedding requires something especially important from everyone attending:"],
        ['q', "Cultural awareness, consideration and a willingness not to judge unfamiliar customs through the expectations of your own culture."],
        ['p', "The following principles draw on established international and Asian wedding etiquette, with particular attention to Thai cultural values where they are relevant."],
        ['q', "Different cultures may have different rules. Courtesy is what allows them to celebrate together."]
      ],
      sources: [
        ["Tatler Asia · Wedding Etiquette: How To Be A Good Wedding Guest", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"],
        ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
      ]
    },
    rules: [
      {
        n: '01', title: "Remember Whose Celebration It Is",
        blocks: [
          ['p', "A wedding celebrates the bride and groom."],
          ['p', "It is not an opportunity to demonstrate your own importance, establish your social position, prove how close you are to the couple or compete for attention."],
          ['p', "A thoughtful guest does not need the most prominent position, the longest conversation, the best photograph or constant proximity to the bride and groom to validate their relationship with them."],
          ['p', "Your presence should add to their celebration, not compete with it."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
        ]
      },
      {
        n: '02', title: "Sometimes Friendship Means Making Space",
        blocks: [
          ['p', "Being close to someone does not mean claiming them."],
          ['p', "One of the quietest demonstrations of consideration at a wedding is knowing when to step forward — and when to step back."],
          ['p', "Parents, grandparents, siblings, family members, older guests and others may have particular roles or significance during different moments of a wedding."],
          ['p', "A considerate guest notices this."],
          ['p', "They do not need to occupy every available space or every available moment with the couple."],
          ['p', "Making space does not make you less important. It can demonstrate confidence, generosity and respect."],
          ['p', "The strongest relationships rarely need to be demonstrated through position, proximity or attention."],
          ['p', "Sometimes the clearest sign of closeness is feeling secure enough not to demand proof of it."]
        ],
        sources: [
          ["Emily Post · Wedding Ceremony Seating Arrangements", "https://emilypost.com/advice/wedding-ceremony-seating-arrangements"],
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"]
        ]
      },
      {
        n: '03', title: "Freedom of Choice Is Not Freedom From Consideration",
        blocks: [
          ['p', "Not every detail of a wedding is controlled by a written instruction."],
          ['p', "Sometimes guests are given freedom to choose."],
          ['p', "That freedom should not automatically be interpreted as:"],
          ['p', "“I can take whatever I want.”"],
          ['p', "Good etiquette asks another question:"],
          ['p', "“Before I choose, is there someone else I should consider?”"],
          ['p', "If you are uncertain whether taking a particular place, position or opportunity would be appropriate: Ask rather than assume."],
          ['p', "A considerate guest does not ask only: “Am I allowed to do this?” They also ask: “Is it appropriate for me to do this?”"],
          ['p', "Etiquette often begins where the written rules end."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"],
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"]
        ]
      },
      {
        n: '04', title: "Respect Arrangements That Have Already Been Made",
        blocks: [
          ['p', "Weddings involve many interconnected decisions that guests may never see."],
          ['p', "Seating, timing, accommodation, transportation, ceremonies, meals, photographs and family arrangements may all have reasons that are not immediately obvious."],
          ['p', "Assigned reception seating is a particularly clear example. A guest should not move place cards, change tables or independently rearrange a plan because another option appears preferable."],
          ['p', "If something has clearly been arranged, respect the arrangement before assuming that changing it will not matter."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
        ]
      },
      {
        n: '05', title: "Reserved Means Reserved — Even When It Is Empty",
        blocks: [
          ['p', "Certain ceremony seats may be reserved for parents, grandparents, immediate family or other designated people."],
          ['p', "Never take a family or reserved seat simply because it is empty."],
          ['p', "The person may be participating in the ceremony, arriving separately or temporarily away."],
          ['p', "An empty reserved seat is still a reserved seat."],
          ['p', "You may not know why it has been kept available. This can be particularly important in cultures where parents, grandparents and senior relatives have specific ceremonial roles."]
        ],
        sources: [
          ["Emily Post · Wedding Ceremony Seating Arrangements", "https://emilypost.com/advice/wedding-ceremony-seating-arrangements"],
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"]
        ]
      },
      {
        n: '06', title: "An Invitation Is Personal",
        blocks: [
          ['p', "An invitation applies to the people who have actually been invited."],
          ['p', "Do not assume that a partner, child, friend or additional guest can simply be added."],
          ['p', "Do not arrive with an unexpected plus-one or independently extend somebody else’s invitation."],
          ['p', "When in doubt, ask. Never assume."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"],
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"]
        ]
      },
      {
        n: '07', title: "RSVP Is a Commitment, Not an Expression of Interest",
        blocks: [
          ['p', "An RSVP is part of the planning of the wedding, not simply an indication that attending sounds appealing."],
          ['p', "Respond by the requested deadline and through the requested method."],
          ['p', "Once you have accepted, treat that response as a genuine commitment."],
          ['p', "Plans can change for legitimate reasons, but a confirmed place may already be incorporated into seating, food, accommodation, transportation and other arrangements."],
          ['p', "Accept thoughtfully. Decline honestly. Communicate genuine changes promptly."]
        ],
        sources: [
          ["Emily Post · Wedding Etiquette", "https://emilypost.com/advice/wedding-etiquette"]
        ]
      },
      {
        n: '08', title: "Changing Your Plans Does Not Necessarily Remove the Arrangements Made for You",
        blocks: [
          ['p', "Wedding arrangements are often confirmed before a guest arrives."],
          ['p', "A personal change therefore does not necessarily mean that arrangements already made for that person simply disappear."],
          ['p', "The considerate approach is not to assume: “If I don’t use it, it no longer affects anyone.”"],
          ['p', "Instead: Ask whether your proposed change affects arrangements that have already been made."],
          ['p', "This does not mean that every unused room, meal or service at every wedding must be paid for by a guest."],
          ['p', "Your change of plans and the host’s existing commitments are not necessarily the same thing."]
        ],
        sources: [
          ["Emily Post · Wedding Etiquette", "https://emilypost.com/advice/wedding-etiquette"]
        ]
      },
      {
        n: '09', title: "A Personal Solution Is Not Always a Simpler Solution",
        blocks: [
          ['p', "This is especially relevant at destination weddings."],
          ['p', "Accommodation, transportation, guest numbers, catering, seating and event schedules may form parts of one larger plan."],
          ['p', "Something that appears easier or cheaper from one person’s perspective may create additional coordination, costs or limitations elsewhere."],
          ['p', "Before independently changing an arrangement, ask: “Does this actually make things easier for the overall wedding?”"],
          ['p', "If you do not know: Ask rather than assume."]
        ],
        sources: []
      },
      {
        n: '10', title: "Follow the Dress Code",
        blocks: [
          ['p', "A wedding dress code is part of the celebration’s planning, not simply a suggestion."],
          ['p', "If the invitation specifies Black Tie, traditional dress, formal attire, white attire or another particular dress code: Respect the guidance provided."]
        ],
        sources: [
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"]
        ]
      },
      {
        n: '11', title: "Dress Etiquette Is Cultural",
        blocks: [
          ['p', "Wedding colours and clothing do not have universal meanings."],
          ['p', "A familiar Western convention may carry a completely different meaning elsewhere."],
          ['p', "At an international wedding, the appropriate question is not: “What would normally be done at a wedding in my culture?” but: “What is appropriate for this wedding?”"],
          ['p', "The explicit dress code and cultural guidance provided for that celebration should take precedence over assumptions."]
        ],
        sources: [
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"],
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"]
        ]
      },
      {
        n: '12', title: "A Multicultural Wedding Requires Cultural Awareness",
        blocks: [
          ['p', "This principle sits at the heart of the entire guide."],
          ['p', "A multicultural wedding can bring together people with very different understandings of hospitality, family, hierarchy, dress, religion, gifts, generosity, seating and appropriate guest behaviour."],
          ['p', "What feels completely normal in one culture may carry a very different meaning in another."],
          ['p', "Your own cultural expectations are not automatically the standard by which another wedding should be judged."],
          ['p', "When something feels unfamiliar, the considerate response is not: “This is strange.” “This isn’t how a wedding should work.” “We don’t do this where I come from.”"],
          ['p', "Instead: “I may be experiencing a wedding tradition through a cultural framework different from my own.”"],
          ['p', "Nobody is required to understand every tradition in advance."],
          ['p', "Good multicultural etiquette means approaching unfamiliar customs with curiosity and respect: Observe first. Listen. Follow the guidance provided. Ask respectfully when necessary."],
          ['p', "Different does not mean wrong. Unfamiliar does not mean inappropriate."],
          ['p', "It is to allow different traditions and different people to share the same celebration respectfully."]
        ],
        sources: [
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"],
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"],
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
        ]
      },
      {
        n: '13', title: "Be Present During the Ceremony",
        blocks: [
          ['p', "The ceremony is not ordinary social time."],
          ['p', "Silence your phone. Avoid unnecessary conversations. Do not allow a screen, ringtone or attempt to capture your own photograph to become part of somebody else’s vows."],
          ['p', "If a couple requests an unplugged ceremony, respect it."],
          ['p', "Be present for the moment you were invited to witness."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"],
          ["Tatler Asia · Wedding Etiquette", "https://www.tatlerasia.com/style/bridal/wedding-etiquette-how-to-be-a-good-wedding-guest"]
        ]
      },
      {
        n: '14', title: "Don’t Turn Personal Preferences Into Additional Work",
        blocks: [
          ['p', "Genuine dietary, medical, accessibility, religious or other important requirements should be communicated."],
          ['p', "A preference is different from a requirement."],
          ['p', "Good etiquette does not mean never asking for help."],
          ['p', "It means recognising the difference between: “I need help with this.” and “I would prefer this, so the arrangement should be reorganised around me.”"],
          ['p', "When you genuinely need something, communicate it clearly. When it is simply a preference, remain aware of the work your request may create for others."]
        ],
        sources: []
      },
      {
        n: '15', title: "Use the Information and People Provided to Help You",
        blocks: [
          ['p', "Questions are normal. Special circumstances are normal. Needing assistance is normal."],
          ['p', "But the bride and groom should not have to become the logistics department for their own wedding."],
          ['p', "When a wedding provides a planner, coordinator, concierge, hotel contact, Guest Relations team or another designated contact: Use that channel."],
          ['p', "Ask for help — but ask the person provided to help you."],
          ['p', "A designated contact is not a barrier between guests and the couple."],
          ['p', "It allows guests to receive support while allowing the bride and groom to be bride and groom."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
        ]
      },
      {
        n: '16', title: "Respect Practical Limits",
        blocks: [
          ['p', "Guests do not always see the practical limitations behind a wedding decision."],
          ['p', "Venues have capacities. Budgets have limits. Guest lists, rooms, seats and other resources may be finite."],
          ['p', "Those constraints can affect invitations, accommodation, seating and schedules without being a judgment about the value of a relationship."],
          ['p', "A personal disappointment should therefore not automatically become: “This shows how important I am to them.”"],
          ['p', "Sometimes a practical limit is simply a practical limit."]
        ],
        sources: []
      },
      {
        n: '17', title: "Don’t Compete for Attention or Position",
        blocks: [
          ['p', "Participate. Celebrate. Dance. Enjoy yourself."],
          ['p', "But understand the difference between being part of the celebration and trying to become the celebration."],
          ['p', "Parents may sit somewhere different from friends. Family members may participate in particular ceremonies. Some people may appear in particular photographs. Others may have responsibilities behind the scenes."],
          ['p', "A seat is a seat. A photograph is a photograph. A role is a role. None of them needs to become a measure of your importance."],
          ['p', "Your relationship with the bride and groom does not need to be publicly proven through proximity."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"],
          ["Emily Post · Wedding Ceremony Seating Arrangements", "https://emilypost.com/advice/wedding-ceremony-seating-arrangements"]
        ]
      },
      {
        n: '18', title: "Give the Bride and Groom Room to Experience Their Own Wedding",
        blocks: [
          ['p', "The bride and groom have invited many people because those people matter to them."],
          ['p', "During their wedding they may be moving between ceremonies, families, photographs, traditions and dozens of conversations."],
          ['p', "No individual guest can reasonably expect their normal relationship with them to operate exactly as it would on an ordinary day."],
          ['p', "A thoughtful friend understands this. They do not measure friendship by minutes of attention. They do not need to establish their position. They do not compete with family or other friends."],
          ['p', "They are secure enough to make space."],
          ['p', "Sometimes stepping back, allowing somebody else forward and simply being happy to see people you care about enjoying their wedding is one of the most generous things a friend can do."],
          ['p', "You do not demonstrate your importance by demanding proximity to the bride and groom. You demonstrate consideration by helping them enjoy their wedding without having to manage your expectations."]
        ],
        sources: [
          ["Emily Post · The Good Guest’s Pledge", "https://emilypost.com/advice/the-good-guests-pledge"]
        ]
      },
      {
        n: '19', title: "Hospitality Is Something to Appreciate, Not Something to Maximise",
        blocks: [
          ['p', "Wedding hospitality can take many forms."],
          ['p', "A couple may host dinner, drinks, breakfast, transportation, accommodation, experiences, gifts or other parts of the celebration."],
          ['p', "Some elements may be fully hosted. Some may be partly hosted. Others may be paid for by guests."],
          ['p', "When something is complimentary, good guest etiquette is not to approach the wedding by calculating: “How much can I get for free?” or “How can I arrange this so that I personally contribute as little as possible?”"],
          ['p', "A wedding invitation is first and foremost an invitation to support and celebrate the people getting married."],
          ['h', "A Thai Perspective"],
          ['p', "Traditional Thai wedding culture provides an especially useful perspective."],
          ['p', "The Thailand Foundation’s guide explains that although some Thai wedding guests give presents, the majority traditionally give cash to the couple, primarily to help cover wedding costs. It even describes the practice of an invited guest who cannot attend arranging for another attendee to deliver their envelope."],
          ['p', "This does not mean every guest must repay the cost of their meal, room or experience. It does not prescribe how a modern international wedding must be financed. And it does not mean every Thai family follows precisely the same custom."],
          ['p', "The traditional role of a wedding guest is not simply to receive hospitality. It also involves supporting the people getting married."],
          ['p', "A complimentary dinner still has value. A complimentary breakfast still has value. A complimentary hotel night still has value. A hosted transfer still has value. A complimentary experience still has value."],
          ['p', "Complimentary means that somebody else has chosen to pay for it. It does not mean that it costs nothing."],
          ['p', "The considerate question is not: “What else can I get for free?” It is: “What has been generously offered to me, and how can I receive that hospitality respectfully?”"],
          ['p', "Generosity from the hosts deserves consideration from the guests."]
        ],
        sources: [
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"]
        ]
      },
      {
        n: '20', title: "Never Put the Bride and Groom in a Position Where They Have to Defend Their Hospitality",
        blocks: [
          ['p', "At some weddings, the hosts cover everything."],
          ['p', "At others — particularly international and destination weddings — hospitality may be shared differently."],
          ['p', "Guests may pay for their flights, contribute towards accommodation or cover certain parts of their stay, while the hosts provide other accommodation, meals, celebrations, transportation, gifts or experiences."],
          ['p', "There is nothing inherently impolite about either model."],
          ['p', "What matters is how guests respond to the arrangement."],
          ['p', "If the bride and groom have clearly explained what they are hosting and where guests are being asked to contribute, a guest should be careful not to turn that arrangement into a personal negotiation with the couple."],
          ['p', "For example: “Do I really have to pay for the room?” “Can I stay somewhere cheaper and still come to everything else?” “If I don’t use the room, can’t you simply give it to somebody else?” “Wouldn’t it be easier for you if I booked another hotel myself?”"],
          ['p', "From the guest’s perspective, these questions may sound practical — or even helpful. But the guest does not necessarily know whether their proposed solution actually helps the wedding."],
          ['p', "A room may already form part of a hotel buyout. Accommodation may be connected to capacity, catering, transportation, schedules or other contractual arrangements."],
          ['p', "A guest choosing a cheaper hotel may reduce their own cost without reducing the hosts’ cost at all. It may even create additional logistics."],
          ['p', "Cheaper for the guest does not automatically mean easier or cheaper for the bride and groom."],
          ['h', "Why This Matters Particularly in Thai Culture"],
          ['p', "This is where the Thai concept of <em>kreng jai</em> — เกรงใจ — becomes especially relevant."],
          ['p', "There is no exact English equivalent. <em>Kreng jai</em> involves consideration for other people, awareness of how your actions affect them and reluctance to impose, inconvenience or embarrass them."],
          ['p', "Before asking “Can I get a different arrangement?”, ask “What position will this question put the other person in?”"],
          ['p', "At a wedding, a seemingly simple negotiation can force the bride or groom to explain why the hotel has been booked in a particular way, why a guest contribution is necessary, why a room cannot simply be reassigned, why one part is complimentary while another requires a contribution, or why an exception for one person may create a problem for everyone else."],
          ['p', "Or, most uncomfortably: why the bride and groom are not simply paying for even more themselves."],
          ['p', "It has placed the hosts in the position of having to defend their hospitality and potentially their finances."],
          ['h', "Protecting Face and Dignity"],
          ['p', "Thai culture also places considerable importance on preserving social harmony and face."],
          ['p', "A bride or groom should not unnecessarily be placed in a situation where they must demonstrate that they can afford their own wedding."],
          ['p', "They should not have to defend why they are asking guests to contribute towards one element while generously hosting others."],
          ['p', "They should not have to choose personally between refusing a guest and making an exception they cannot reasonably offer everyone."],
          ['p', "<em>Kreng jai</em> asks people to consider the burden their request may place on another person before placing that burden on them."],
          ['h', "Thai Wedding Culture Adds Another Important Perspective"],
          ['p', "The Thailand Foundation explains that the majority of Thai wedding guests traditionally give money to the couple, primarily to help cover wedding costs."],
          ['p', "This does not dictate how a modern multicultural destination wedding must operate. But it demonstrates that the traditional Thai guest role contains a clear element of supporting the couple, rather than approaching the celebration solely by asking what can be received from it."],
          ['p', "If a couple is already providing substantial hospitality but asks guests to contribute towards one particular element, the considerate starting point should not automatically be: “How can I avoid that contribution while still participating in everything else that is hosted?”"],
          ['p', "It should be: “I understand the arrangement. If it creates a genuine difficulty for me, how can I address that respectfully without putting the bride and groom in an uncomfortable position?”"],
          ['h', "Genuine Difficulty Is Different From Negotiating for the Cheapest Option"],
          ['p', "Nobody should be embarrassed because they genuinely cannot afford something. Nobody should stay silent about a genuine financial, medical, family or personal difficulty."],
          ['p', "Asking for help is not bad etiquette."],
          ['p', "There is a significant difference between: “This arrangement creates a genuine difficulty for me. Could you please help me understand what options are available?” and “I found something cheaper for myself, so I’ll do that and still join everything else.”"],
          ['p', "The first communicates a problem and asks for help. The second assumes that the guest’s preferred solution also works for the hosts. It may not."],
          ['h', "Ask for Help — Do Not Make the Couple Defend Their Wedding"],
          ['p', "If a wedding provides Guest Relations, a planner, coordinator or family representative, genuine individual circumstances should ideally be discussed through that person."],
          ['p', "This protects both sides. The guest can explain a private difficulty discreetly. The bride and groom do not have to negotiate individual contributions personally. If an exception requires their decision, the representative can discuss it with them privately."],
          ['p', "A considerate guest does not decide what is easiest for the bride and groom."],
          ['p', "A considerate guest does not make the bride and groom personally justify their finances or hospitality."],
          ['p', "A considerate guest does not assume that paying less personally means creating less cost for the wedding."],
          ['p', "If there is a genuine difficulty: Explain the difficulty respectfully. Ask for help privately. Allow the people who understand the wedding arrangements to determine what solution actually works."],
          ['h', "The Principle"],
          ['p', "Do not measure wedding hospitality by asking how much you can receive without contributing."],
          ['p', "Do not make the bride and groom personally justify why a contribution is requested."],
          ['p', "Do not assume that arranging something cheaper for yourself automatically helps the wedding as a whole."],
          ['p', "Especially within a culture that places great importance on <em>kreng jai</em> and preserving face: Do not unnecessarily place the people whose wedding you are attending in a position where they must defend their generosity, their finances or their ability to host you."],
          ['p', "If you genuinely need help, ask for it respectfully and privately."],
          ['p', "Good hospitality protects the dignity of the guest. Good guest etiquette protects the dignity of the hosts."]
        ],
        sources: [
          ["Thailand Foundation · Thai Wedding", "https://thailandfoundation.or.th/thai-wedding/"],
          ["Thailand Foundation · Understanding Mai Pen Rai and Thai Face-Saving Culture", "https://thailandfoundation.or.th/understanding-mai-pen-rai/"],
          ["The Nation Thailand · Kreng Jai and Thai Politeness", "https://www.nationthailand.com/life/art-culture/40051274"],
          ["Mahidol University · Research on Kreng Jai and Thai Cultural Consideration", "https://murex.mahidol.ac.th/en/publications/a-reflection-on-intercept-survey-use-in-thailand-some-cultural-co/"],
          ["Mahidol University · Customer Deference and Kreng Jai in Thailand", "https://repository.li.mahidol.ac.th/entities/publication/49aa41bc-4f1b-4bbf-8df7-8718899bdfba"]
        ]
      }
    ],
    closing: {
      title: "The Simplest Unwritten Rule",
      blocks: [
        ['q', "Be considerate."],
        ['l', [
          "Respect the invitation.",
          "Respect the arrangements.",
          "Respect the dress code.",
          "Respect reserved spaces — even when they are empty.",
          "Respect cultures and traditions that may be different from your own.",
          "Treat an RSVP as a commitment.",
          "Understand that changing your plans does not automatically undo arrangements already made for you.",
          "Ask rather than assume.",
          "Understand that being allowed to do something does not automatically make it considerate to do it.",
          "Make genuine needs known without turning preferences into demands.",
          "Use the designated contact when one is provided.",
          "Respect practical limits that you may not be able to see.",
          "Do not compete for status, proximity or attention.",
          "Make space for other people.",
          "Receive hospitality with appreciation rather than trying to maximise what you receive from it.",
          "Do not make the bride and groom defend their generosity or justify their finances."
        ]],
        ['p', "And at a multicultural wedding, remember one principle above all:"],
        ['q', "Your culture does not have to become somebody else’s culture for both to deserve respect."],
        ['l', [
          "Different traditions can share the same celebration.",
          "Different expectations can meet with understanding.",
          "Different people can celebrate together with courtesy."
        ]],
        ['p', "And remember why everyone is there:"],
        ['q', "to celebrate and support the bride and groom."]
      ]
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = UR; else root.SIYL_UNWRITTEN = UR;
})(this);
