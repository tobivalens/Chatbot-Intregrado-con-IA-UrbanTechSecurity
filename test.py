import telebot
TOKEN = "8576850045:AAFZYMbb10aEW708RkPiseAKJD5LcF712pI"
bot = telebot.TeleBot(TOKEN)
@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "¡Hola, soy Claudia! Tu asistente de seguridad de confianza")
bot.polling()
