import { Expose, Transform } from 'class-transformer';

export class CommentTelegramDto {
  @Expose()
  event: string;

  // uid заявки
  @Expose()
  @Transform(({ obj }) => obj.comment?.entity?.uid || '', { toClassOnly: true })
  uid: string;

  // Дата создания
  @Expose()
  @Transform(
    ({ obj }) =>
      obj.comment?.createDate
        ? new Date(obj.comment?.createDate).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
        : null,
    { toClassOnly: true },
  )
  createDate: string;

  // От
  @Expose()
  @Transform(({ obj }) => obj.comment?.account?.fullName || obj.comment?.account?.email || '', { toClassOnly: true })
  accountName: string;

  // Текст комментария
  @Expose()
  @Transform(({ obj }) => obj.comment?.text || '', { toClassOnly: true })
  text: string;
}
