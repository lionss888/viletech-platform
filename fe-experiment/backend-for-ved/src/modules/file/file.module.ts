import { Module } from '@nestjs/common';
import { FileSiteModule } from './web/site/file-site.module';
import { FileAdminModule } from './web/admin/file-admin.module';
import { FileRpcModule } from './rpc/file-rpc.module';
import { FileProviderModule } from './web/provider/file-provider.module';
import { FileEventModule } from './event/file-event.module';
import { FileOneCModule } from './web/one-c/file-one-c.module';

@Module({
  imports: [FileSiteModule, FileAdminModule, FileProviderModule, FileOneCModule, FileRpcModule, FileEventModule],
})
export class FileModule {}
