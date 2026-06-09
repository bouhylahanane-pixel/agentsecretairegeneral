import imaplib, email
mail = imaplib.IMAP4_SSL('imap.gmail.com')
mail.login('agentsecretairegeneral@gmail.com', 'ymmp umls xfnc gthx')
mail.select('inbox')
status, messages = mail.search(None, 'ALL')
nums = messages[0].split()[-5:]
for num in nums:
    typ, data = mail.fetch(num, '(RFC822)')
    msg = email.message_from_bytes(data[0][1])
    print('Subject:', msg['Subject'])
    print('To:', msg['To'])
    print('---')
