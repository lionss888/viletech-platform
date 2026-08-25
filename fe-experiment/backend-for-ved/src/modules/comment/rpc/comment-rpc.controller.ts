import { Controller, Inject } from '@nestjs/common';
import { ICommentService } from '../service/comment.service.interface';
import { COMMENT_SERVICE } from '../comment.constants';

@Controller()
export class CommentRpcController {
  constructor(@Inject(COMMENT_SERVICE) private readonly service: ICommentService) {}
}
